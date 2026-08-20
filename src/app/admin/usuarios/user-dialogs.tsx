"use client";

import { KeyRound, Plus } from "lucide-react";
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
import { createUser, resetUserPassword } from "../actions";

type AccountOption = { id: number; name: string };

export function NewUserDialog({ accounts }: { accounts: AccountOption[] }) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState("restaurant");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await createUser(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      formRef.current?.reset();
      setRole("restaurant");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Nuevo usuario
      </Button>

      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              No hay registro público: todos los accesos se crean desde acá.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">Nombre</Label>
                <Input id="u-name" name="name" required placeholder="Nombre y apellido" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-role">Rol</Label>
                <Select
                  id="u-role"
                  name="role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  <option value="restaurant">Restaurante</option>
                  <option value="distributor">Distribuidor</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                name="email"
                type="email"
                required
                spellCheck={false}
                placeholder="dueño@restaurante.com"
              />
            </div>

            {/* La cuenta solo aplica al rol restaurante: es lo que define qué
                datos ve ese usuario. */}
            {role === "restaurant" ? (
              <div className="space-y-1.5">
                <Label htmlFor="u-account">Cuenta</Label>
                <Select id="u-account" name="accountId" required defaultValue="">
                  <option value="" disabled>
                    Elegí una…
                  </option>
                  {accounts.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="u-password">Contraseña</Label>
              <Input
                id="u-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-[11px] text-ex-text-muted">
                Mínimo 8 caracteres. Pasásela al usuario por un canal seguro y
                pedile que la cambie.
              </p>
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

export function ResetPasswordButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [listo, setListo] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await resetUserPassword(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setListo(true);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setListo(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Cambiar contraseña"
        aria-label="Cambiar contraseña"
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]"
      >
        <KeyRound className="size-3.5" />
      </button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>{email}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="userId" value={userId} />

            <div className="space-y-1.5">
              <Label htmlFor={`p-${userId}`}>Contraseña nueva</Label>
              <Input
                id={`p-${userId}`}
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error ? <ErrorBox message={error} /> : null}
            {listo ? (
              <p className="rounded-control border border-ex-success/25 bg-ex-success/10 px-3 py-2 text-xs text-ex-success">
                Contraseña cambiada. Las sesiones abiertas siguen activas hasta
                que venzan.
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {listo ? "Cerrar" : "Cancelar"}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Guardando…" : "Cambiar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
