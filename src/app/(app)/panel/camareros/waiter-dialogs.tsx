"use client";

import { Plus, Power, Settings2 } from "lucide-react";
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
import { Input, Label, Select } from "@/components/ui/input";
import { createWaiter, toggleWaiter, updateWaiter } from "../actions";

type LocationOption = { id: number; name: string };
type WaiterRow = { id: number; name: string; active: boolean; locationId: number };

export function NewWaiterDialog({ locations }: { locations: LocationOption[] }) {
  const t = useTranslations("Camareros");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await createWaiter(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        {t("nuevoCamarero")}
      </Button>

      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("nuevoCamarero")}</DialogTitle>
            <DialogDescription>{t("nuevoCamareroDesc")}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="waiter-name">{t("colNombre")}</Label>
              <Input
                id="waiter-name"
                name="name"
                required
                placeholder={t("nombrePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="waiter-location">{t("colLocal")}</Label>
              <Select
                id="waiter-location"
                name="locationId"
                required
                defaultValue={locations.length === 1 ? String(locations[0].id) : ""}
              >
                {locations.length === 1 ? null : (
                  <option value="" disabled>
                    {t("elegiUno")}
                  </option>
                )}
                {locations.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.name}
                  </option>
                ))}
              </Select>
            </div>

            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancelar")}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? t("creando") : t("crear")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WaiterRowActions({ waiter }: { waiter: WaiterRow }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <EditWaiterDialog waiter={waiter} />
      <ToggleWaiterButton waiter={waiter} />
    </div>
  );
}

function EditWaiterDialog({ waiter }: { waiter: WaiterRow }) {
  const t = useTranslations("Camareros");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await updateWaiter(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("editar")}
        aria-label={t("editar")}
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]"
      >
        <Settings2 className="size-3.5" />
      </button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("editar")}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={waiter.id} />
            <div className="space-y-1.5">
              <Label htmlFor={`w-name-${waiter.id}`}>{t("colNombre")}</Label>
              <Input
                id={`w-name-${waiter.id}`}
                name="name"
                defaultValue={waiter.name}
                required
              />
            </div>
            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancelar")}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? t("guardando") : t("guardar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleWaiterButton({ waiter }: { waiter: WaiterRow }) {
  const t = useTranslations("Camareros");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const resultado = await toggleWaiter(waiter.id, !waiter.active);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={
        error ??
        (waiter.active ? t("desactivarHint") : t("activar"))
      }
      aria-label={waiter.active ? t("desactivar") : t("activar")}
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-control border transition-colors " +
        "active:scale-[0.98] disabled:opacity-40 " +
        (error
          ? "border-ex-danger/40 text-ex-danger"
          : waiter.active
            ? "border-ex-border text-ex-text-muted hover:border-ex-danger/40 hover:text-ex-danger"
            : "border-ex-border text-ex-text-muted hover:border-ex-success/40 hover:text-ex-success")
      }
    >
      <Power className="size-3.5" />
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-control border border-ex-danger/25 bg-ex-danger/10 px-3 py-2 text-xs text-ex-danger"
    >
      {message}
    </p>
  );
}
