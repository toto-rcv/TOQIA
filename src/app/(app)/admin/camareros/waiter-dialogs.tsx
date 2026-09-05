"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { deleteWaiter } from "../actions";

type WaiterRow = { id: number; name: string };

/**
 * Borrar un empleado, desde la vista global del admin.
 *
 * Esta vista es de solo lectura para todo lo demás —los camareros los
 * administra cada empresa desde su panel— salvo esto: sirve para limpiar un
 * registro suelto sin tener que entrar al panel de ese restaurante.
 */
export function DeleteWaiterDialog({ waiter }: { waiter: WaiterRow }) {
  const t = useTranslations("Camareros");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("borrar")}
        aria-label={t("borrar")}
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-danger/40 hover:text-ex-danger active:scale-[0.98]"
      >
        <Trash2 className="size-3.5" />
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("borrarNombre", { nombre: waiter.name })}</DialogTitle>
          <DialogDescription>{t("borrarCamareroDesc")}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {error ? (
            <p
              role="alert"
              className="rounded-control border border-ex-danger/25 bg-ex-danger/10 px-3 py-2 text-xs text-ex-danger"
            >
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
                const resultado = await deleteWaiter(waiter.id);
                if (!resultado.ok) {
                  setError(resultado.error);
                  return;
                }
                setOpen(false);
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
