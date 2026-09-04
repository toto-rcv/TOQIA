"use client";

import { Plus, Power, Settings2 } from "lucide-react";
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
        Nuevo camarero
      </Button>

      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo camarero</DialogTitle>
            <DialogDescription>
              Después le asignás una pulsera desde la sección Pulseras.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="waiter-name">Nombre</Label>
              <Input id="waiter-name" name="name" required placeholder="Nombre y apellido" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="waiter-location">Local</Label>
              <Select
                id="waiter-location"
                name="locationId"
                required
                defaultValue={locations.length === 1 ? String(locations[0].id) : ""}
              >
                {locations.length === 1 ? null : (
                  <option value="" disabled>
                    Elegí uno…
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
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Creando…" : "Crear"}
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
        title="Editar camarero"
        aria-label="Editar camarero"
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]"
      >
        <Settings2 className="size-3.5" />
      </button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar camarero</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={waiter.id} />
            <div className="space-y-1.5">
              <Label htmlFor={`w-name-${waiter.id}`}>Nombre</Label>
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
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleWaiterButton({ waiter }: { waiter: WaiterRow }) {
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
        (waiter.active
          ? "Desactivar (sus pulseras siguen funcionando)"
          : "Activar")
      }
      aria-label={waiter.active ? "Desactivar camarero" : "Activar camarero"}
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
