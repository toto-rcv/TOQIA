"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { crearEmpresa, deleteAccount } from "../actions";

/**
 * Alta de un restaurante nuevo.
 *
 * Pide lo mínimo para que el cliente pueda entrar y empezar: nombre, email y
 * contraseña. Todo lo demás —logo, dirección, redes, carta— lo carga el propio
 * restaurante desde su panel, que es donde tiene sentido.
 *
 * Al terminar muestra el email y la contraseña juntos para copiar: es el único
 * momento en que la contraseña está a la vista, porque después queda hasheada
 * y no hay forma de recuperarla.
 */
export function NuevoRestauranteDialog() {
  const t = useTranslations("Distribuidor");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  const [credenciales, setCredenciales] = React.useState<{
    nombre: string;
    email: string;
    password: string;
  } | null>(null);

  function cerrar(abierto: boolean) {
    setOpen(abierto);
    if (!abierto) setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    const nombre = String(formData.get("nombre") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const resultado = await crearEmpresa(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      formRef.current?.reset();
      setOpen(false);
      setCredenciales({ nombre, email, password });
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => cerrar(true)}>
        <Plus />
        {t("nuevoRestaurante")}
      </Button>

      <Dialog open={open} onOpenChange={cerrar}>
        <DialogContent>
          <form ref={formRef} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("nuevoRestaurante")}</DialogTitle>
              <DialogDescription>{t("nuevoRestauranteDesc")}</DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="r-nombre">{t("nombreRestaurante")}</Label>
                <Input
                  id="r-nombre"
                  name="nombre"
                  required
                  placeholder={t("nombreRestaurantePlaceholder")}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-rubro">{t("rubro")}</Label>
                <Input
                  id="r-rubro"
                  name="rubro"
                  maxLength={60}
                  placeholder={t("rubroPlaceholder")}
                  autoComplete="off"
                />
                <p className="text-[12px] text-ex-text-muted">{t("rubroAyuda")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="r-email">{t("emailAcceso")}</Label>
                  <Input
                    id="r-email"
                    name="email"
                    type="email"
                    required
                    placeholder={t("emailPlaceholder")}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-password">{t("password")}</Label>
                  <Input
                    id="r-password"
                    name="password"
                    required
                    minLength={8}
                    placeholder={t("passwordPlaceholder")}
                    autoComplete="new-password"
                    spellCheck={false}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-persona">
                  {t("nombrePersona")}{" "}
                  <span className="text-ex-text-disabled">{t("opcional")}</span>
                </Label>
                <Input
                  id="r-persona"
                  name="nombreUsuario"
                  placeholder={t("nombrePersonaPlaceholder")}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-review">
                  {t("enlaceResenas")}{" "}
                  <span className="text-ex-text-disabled">{t("opcional")}</span>
                </Label>
                <Input
                  id="r-review"
                  name="googleReviewUrl"
                  placeholder="https://g.page/r/…"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-[11px] leading-relaxed text-ex-text-muted">
                  {t("enlaceResenasHint")}
                </p>
              </div>

              {error ? (
                <p role="alert" className="text-[12px] leading-relaxed text-ex-danger">
                  {error}
                </p>
              ) : null}
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => cerrar(false)}
                disabled={pending}
              >
                {t("cancelar")}
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? t("creando") : t("crearRestaurante")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CredencialesDialog
        credenciales={credenciales}
        onClose={() => setCredenciales(null)}
      />
    </>
  );
}

/** Las credenciales recién creadas, para pasárselas al cliente. */
function CredencialesDialog({
  credenciales,
  onClose,
}: {
  credenciales: { nombre: string; email: string; password: string } | null;
  onClose: () => void;
}) {
  const t = useTranslations("Distribuidor");
  const [copiado, setCopiado] = React.useState(false);

  // El texto que se le pasa al cliente va en el idioma del panel: lo escribe
  // el distribuidor y se lo manda a alguien que habla su mismo idioma.
  const texto = credenciales
    ? t("textoCredenciales", {
        email: credenciales.email,
        password: credenciales.password,
      })
    : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegadores sin permiso de portapapeles (o sin HTTPS): el texto está
      // igual a la vista y se puede seleccionar a mano.
      setCopiado(false);
    }
  }

  return (
    <Dialog
      open={credenciales !== null}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("quedoCreado", { nombre: credenciales?.nombre ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("credencialesDesc")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <pre className="overflow-x-auto rounded-control border border-ex-border bg-ex-elevated p-3 font-mono text-[12px] leading-relaxed text-ex-text">
            {texto}
          </pre>

          <Button type="button" variant="secondary" onClick={copiar}>
            {copiado ? <Check /> : <Copy />}
            {copiado ? t("copiado") : t("copiar")}
          </Button>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="primary" onClick={onClose}>
            {t("listo")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Borrado ─────────────────────────────────────────────────────────────── */

type CuentaRow = {
  id: number;
  name: string;
  locationCount: number;
  braceletCount: number;
};

export function DeleteAccountDialog({ cuenta }: { cuenta: CuentaRow }) {
  const t = useTranslations("Distribuidor");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("borrarEmpresa")}
        aria-label={t("borrarEmpresa")}
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-danger/40 hover:text-ex-danger active:scale-[0.98]"
      >
        <Trash2 className="size-3.5" />
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("borrarNombre", { nombre: cuenta.name })}</DialogTitle>
          <DialogDescription>
            {t("borrarEmpresaDesc", {
              locales: cuenta.locationCount,
              pulseras: cuenta.braceletCount,
            })}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {error ? (
            <p role="alert" className="text-[12px] leading-relaxed text-ex-danger">
              {error}
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancelar")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const resultado = await deleteAccount(cuenta.id);
                if (!resultado.ok) {
                  setError(resultado.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {pending ? t("borrando") : t("borrarIgual")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
