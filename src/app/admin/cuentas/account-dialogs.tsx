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
import { slugify } from "@/lib/validation";
import { createAccount, toggleAccount, updateAccount } from "../actions";

type Distributor = { id: string; name: string; email: string };

type AccountRow = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  subscriptionStatus: string;
  subscriptionPrice: string | null;
  subscriptionExpiresAt: Date | null;
  distributorId: string | null;
};

const ESTADOS = [
  { value: "trial", label: "Prueba" },
  { value: "active", label: "Activa" },
  { value: "past_due", label: "Impaga" },
  { value: "cancelled", label: "Cancelada" },
];

export function NewAccountDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTocado, setSlugTocado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // El slug sigue al nombre hasta que el usuario lo edita a mano.
  React.useEffect(() => {
    if (!slugTocado) setSlug(slugify(name));
  }, [name, slugTocado]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await createAccount(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setName("");
      setSlug("");
      setSlugTocado(false);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Nueva cuenta
      </Button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva cuenta</DialogTitle>
            <DialogDescription>
              Una cuenta agrupa los locales de un mismo cliente. Después le
              agregás los locales.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Nombre</Label>
              <Input
                id="account-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Grupo Gastronómico Norte"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-slug">Slug</Label>
              <Input
                id="account-slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTocado(true);
                  setSlug(event.target.value);
                }}
                required
                spellCheck={false}
                className="font-mono text-xs"
              />
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

export function AccountRowActions({
  account,
  distributors,
}: {
  account: AccountRow;
  distributors: Distributor[];
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <EditAccountDialog account={account} distributors={distributors} />
      <ToggleAccountButton account={account} />
    </div>
  );
}

function EditAccountDialog({
  account,
  distributors,
}: {
  account: AccountRow;
  distributors: Distributor[];
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await updateAccount(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOpen(false);
    });
  }

  const vence = account.subscriptionExpiresAt
    ? new Date(account.subscriptionExpiresAt).toISOString().slice(0, 10)
    : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Editar cuenta"
        aria-label="Editar cuenta"
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]"
      >
        <Settings2 className="size-3.5" />
      </button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
            <DialogDescription>
              Cancelar la suscripción corta la redirección de todas sus pulseras.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={account.id} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`a-name-${account.id}`}>Nombre</Label>
                <Input
                  id={`a-name-${account.id}`}
                  name="name"
                  defaultValue={account.name}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`a-slug-${account.id}`}>Slug</Label>
                <Input
                  id={`a-slug-${account.id}`}
                  name="slug"
                  defaultValue={account.slug}
                  required
                  spellCheck={false}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`a-status-${account.id}`}>Suscripción</Label>
                <Select
                  id={`a-status-${account.id}`}
                  name="subscriptionStatus"
                  defaultValue={account.subscriptionStatus}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`a-price-${account.id}`}>Precio</Label>
                <Input
                  id={`a-price-${account.id}`}
                  name="subscriptionPrice"
                  defaultValue={account.subscriptionPrice ?? ""}
                  placeholder="0.00"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`a-expires-${account.id}`}>Vence</Label>
                <Input
                  id={`a-expires-${account.id}`}
                  name="subscriptionExpiresAt"
                  type="date"
                  defaultValue={vence}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`a-dist-${account.id}`}>Distribuidor</Label>
              <Select
                id={`a-dist-${account.id}`}
                name="distributorId"
                defaultValue={account.distributorId ?? ""}
              >
                <option value="">Sin asignar</option>
                {distributors.map((dist) => (
                  <option key={dist.id} value={dist.id}>
                    {dist.name} · {dist.email}
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
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleAccountButton({ account }: { account: AccountRow }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const resultado = await toggleAccount(account.id, !account.active);
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
        (account.active
          ? "Dar de baja (corta todas sus pulseras)"
          : "Reactivar la cuenta")
      }
      aria-label={account.active ? "Dar de baja la cuenta" : "Reactivar la cuenta"}
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-control border transition-colors " +
        "active:scale-[0.98] disabled:opacity-40 " +
        (error
          ? "border-ex-danger/40 text-ex-danger"
          : account.active
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
