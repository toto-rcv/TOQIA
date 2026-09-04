"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle2, DatabaseZap, Languages, Trash2 } from "lucide-react";
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
import { FRASE_DE_CONFIRMACION } from "@/lib/reset-datos";
import { formatNumber } from "@/lib/utils";
import { borrarTodo, ejecutarMigraciones, traducirContenido } from "./actions";

/* ── Aplicar migraciones ──────────────────────────────────────────────────── */

/**
 * Migrar no destruye nada —cada paso consulta la base antes de tocarla y
 * saltea lo que ya está— así que no pide confirmación. Lo único que necesita
 * es no dispararse dos veces mientras corre.
 */
export function MigrarBoton({ alDia }: { alDia: boolean }) {
  const t = useTranslations("Mantenimiento");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [hecho, setHecho] = React.useState<string | null>(null);

  function migrar() {
    setError(null);
    setHecho(null);

    startTransition(async () => {
      const resultado = await ejecutarMigraciones();

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      const informe = resultado.data;
      setHecho(
        informe && informe.aplicados > 0
          ? t("aplicados", { n: informe.aplicados })
          : t("yaAlDia")
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" onClick={migrar} disabled={pending}>
        <DatabaseZap />
        {pending ? t("aplicando") : alDia ? t("volverARevisar") : t("aplicarCambios")}
      </Button>

      {error ? <Mensaje tono="error">{error}</Mensaje> : null}
      {hecho ? <Mensaje tono="ok">{hecho}</Mensaje> : null}
    </div>
  );
}

/* ── Traducir el contenido cargado ────────────────────────────────────────── */

/**
 * Traducir tampoco destruye nada, así que va sin confirmación. Lo que sí
 * necesita es avisar que puede tardar: son siete pedidos a DeepL por plato, en
 * serie, y con una base grande esto son minutos, no segundos.
 */
export function TraducirBoton({ pendientes }: { pendientes: number }) {
  const t = useTranslations("Mantenimiento");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [hecho, setHecho] = React.useState<string | null>(null);

  function traducir() {
    setError(null);
    setHecho(null);

    startTransition(async () => {
      const resultado = await traducirContenido();

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      const informe = resultado.data;
      if (!informe) return;

      setHecho(
        !informe.hayTraductor
          ? t("sinClaveDeepl")
          : informe.traducidas > 0
            ? t("traducidas", { n: informe.traducidas })
            : t("nadaQueTraducir")
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" onClick={traducir} disabled={pending}>
        <Languages />
        {pending
          ? t("traduciendo")
          : pendientes === 0
            ? t("volverARevisar")
            : t("traducirPendientes", {
                n: formatNumber(pendientes, locale),
              })}
      </Button>

      {error ? <Mensaje tono="error">{error}</Mensaje> : null}
      {hecho ? <Mensaje tono="ok">{hecho}</Mensaje> : null}
    </div>
  );
}

/* ── Borrado total ────────────────────────────────────────────────────────── */

export function BorrarTodoDialog({
  total,
  email,
}: {
  total: number;
  email: string;
}) {
  const t = useTranslations("Mantenimiento");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [texto, setTexto] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [hecho, setHecho] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // El botón se habilita solo con la frase exacta. El servidor la vuelve a
  // comprobar igual: esto es comodidad, no seguridad.
  const confirmado = texto.trim() === FRASE_DE_CONFIRMACION;

  function cerrar(abierto: boolean) {
    setOpen(abierto);
    if (!abierto) {
      setTexto("");
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmado) return;

    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await borrarTodo(formData);

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      const borradas = resultado.data?.total ?? 0;
      setHecho(t("baseVaciada", { filas: formatNumber(borradas, locale), email }));
      cerrar(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        onClick={() => cerrar(true)}
        disabled={total === 0}
      >
        <Trash2 />
        {total === 0
          ? t("nadaParaBorrar")
          : t("borrarTodoCon", { filas: formatNumber(total, locale) })}
      </Button>

      {hecho ? <Mensaje tono="ok">{hecho}</Mensaje> : null}

      <Dialog open={open} onOpenChange={cerrar}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("vaciarLaBase")}</DialogTitle>
              <DialogDescription>
                {t("vaciarLaBaseDesc", { filas: formatNumber(total, locale) })}
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-3">
              <p className="text-[13px] leading-relaxed text-ex-text-secondary">
                {t.rich("tuUsuarioSeConserva", {
                  email: () => (
                    <span className="font-mono text-ex-text">{email}</span>
                  ),
                })}
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="confirmacion">
                  {t.rich("escribiParaConfirmar", {
                    frase: () => (
                      <span className="font-mono text-ex-text">
                        {FRASE_DE_CONFIRMACION}
                      </span>
                    ),
                  })}
                </Label>
                <Input
                  id="confirmacion"
                  name="confirmacion"
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={FRASE_DE_CONFIRMACION}
                />
              </div>

              {error ? <Mensaje tono="error">{error}</Mensaje> : null}
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
              <Button
                type="submit"
                variant="danger"
                disabled={!confirmado || pending}
              >
                {pending ? t("borrando") : t("siBorrarTodo")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Auxiliar ─────────────────────────────────────────────────────────────── */

function Mensaje({
  tono,
  children,
}: {
  tono: "ok" | "error";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tono === "error" ? "alert" : "status"}
      className={
        "flex items-start gap-1.5 text-[12px] leading-relaxed " +
        (tono === "error" ? "text-ex-danger" : "text-ex-success")
      }
    >
      {tono === "ok" ? <CheckCircle2 className="mt-px size-3.5 shrink-0" /> : null}
      <span>{children}</span>
    </p>
  );
}
