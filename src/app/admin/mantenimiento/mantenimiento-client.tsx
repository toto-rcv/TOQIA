"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, DatabaseZap, Trash2 } from "lucide-react";
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
import { borrarTodo, ejecutarMigraciones } from "./actions";

/* ── Aplicar migraciones ──────────────────────────────────────────────────── */

/**
 * Migrar no destruye nada —cada paso consulta la base antes de tocarla y
 * saltea lo que ya está— así que no pide confirmación. Lo único que necesita
 * es no dispararse dos veces mientras corre.
 */
export function MigrarBoton({ alDia }: { alDia: boolean }) {
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
          ? `Listo: ${informe.aplicados} cambio(s) aplicado(s).`
          : "La base ya estaba al día: no hubo nada que aplicar."
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" onClick={migrar} disabled={pending}>
        <DatabaseZap />
        {pending
          ? "Aplicando…"
          : alDia
            ? "Volver a revisar"
            : "Aplicar los cambios que faltan"}
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
      setHecho(
        `Base vaciada: ${formatNumber(borradas)} fila(s) borradas. Quedó solo ${email}.`
      );
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
          ? "No hay nada para borrar"
          : `Borrar todo (${formatNumber(total)} filas)`}
      </Button>

      {hecho ? <Mensaje tono="ok">{hecho}</Mensaje> : null}

      <Dialog open={open} onOpenChange={cerrar}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Vaciar la base</DialogTitle>
              <DialogDescription>
                Se van {formatNumber(total)} fila(s) entre cuentas, locales,
                pulseras, camareros, escaneos, cartas, archivos subidos y los
                demás usuarios. No se puede deshacer.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-3">
              <p className="text-[13px] leading-relaxed text-ex-text-secondary">
                Tu usuario{" "}
                <span className="font-mono text-ex-text">{email}</span> se
                conserva, con tu sesión abierta.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="confirmacion">
                  Escribí{" "}
                  <span className="font-mono text-ex-text">
                    {FRASE_DE_CONFIRMACION}
                  </span>{" "}
                  para confirmar
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
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={!confirmado || pending}
              >
                {pending ? "Borrando…" : "Sí, borrar todo"}
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
