"use client";

import { useRouter } from "next/navigation";
import { Check, Copy, Plus } from "lucide-react";
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
import { crearRestaurante } from "../actions";

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
      const resultado = await crearRestaurante(formData);
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
        Nuevo restaurante
      </Button>

      <Dialog open={open} onOpenChange={cerrar}>
        <DialogContent>
          <form ref={formRef} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Nuevo restaurante</DialogTitle>
              <DialogDescription>
                Se crea la cuenta, su primer local y el acceso al panel. El
                resto lo completa el restaurante.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="r-nombre">Nombre del restaurante</Label>
                <Input
                  id="r-nombre"
                  name="nombre"
                  required
                  placeholder="La Parrilla del Centro"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="r-email">Email de acceso</Label>
                  <Input
                    id="r-email"
                    name="email"
                    type="email"
                    required
                    placeholder="dueño@restaurante.com"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-password">Contraseña</Label>
                  <Input
                    id="r-password"
                    name="password"
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    spellCheck={false}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-persona">
                  Nombre de la persona{" "}
                  <span className="text-ex-text-disabled">(opcional)</span>
                </Label>
                <Input
                  id="r-persona"
                  name="nombreUsuario"
                  placeholder="Si lo dejás vacío se usa el del restaurante"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-review">
                  Enlace de reseñas de Google{" "}
                  <span className="text-ex-text-disabled">(opcional)</span>
                </Label>
                <Input
                  id="r-review"
                  name="googleReviewUrl"
                  placeholder="https://g.page/r/…"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-[11px] leading-relaxed text-ex-text-muted">
                  Es lo único imprescindible para que las pulseras sirvan. Si no
                  lo tenés ahora, el restaurante lo carga después desde su
                  panel.
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
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Creando…" : "Crear restaurante"}
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
  const [copiado, setCopiado] = React.useState(false);

  const texto = credenciales
    ? `Acceso a tu panel de Toqia\nUsuario: ${credenciales.email}\nContraseña: ${credenciales.password}`
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
          <DialogTitle>{credenciales?.nombre} quedó creado</DialogTitle>
          <DialogDescription>
            Pasale estos datos al restaurante. La contraseña no se puede volver
            a ver: si se pierde, hay que generar una nueva.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <pre className="overflow-x-auto rounded-control border border-ex-border bg-ex-elevated p-3 font-mono text-[12px] leading-relaxed text-ex-text">
            {texto}
          </pre>

          <Button type="button" variant="secondary" onClick={copiar}>
            {copiado ? <Check /> : <Copy />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="primary" onClick={onClose}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
