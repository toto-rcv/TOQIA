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
import { Input, Label } from "@/components/ui/input";
import { slugify } from "@/lib/validation";
import { createRestaurant, toggleRestaurant, updateRestaurant } from "./actions";

type Restaurant = { id: number; name: string; slug: string; active: boolean };

export function NewRestaurantDialog() {
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
      const result = await createRestaurant(formData);
      if (!result.ok) {
        setError(result.error);
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
        Nuevo restaurante
      </Button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo restaurante</DialogTitle>
            <DialogDescription>
              El slug es un identificador interno; no aparece en las pulseras.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="restaurant-name">Nombre</Label>
              <Input
                id="restaurant-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="La Parrilla del Centro"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="restaurant-slug">Slug</Label>
              <Input
                id="restaurant-slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTocado(true);
                  setSlug(event.target.value);
                }}
                required
                spellCheck={false}
                className="font-mono text-xs"
                placeholder="la-parrilla-del-centro"
              />
            </div>

            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
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

export function RestaurantRowActions({ restaurant }: { restaurant: Restaurant }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <EditRestaurantDialog restaurant={restaurant} />
      <ToggleRestaurantButton restaurant={restaurant} />
    </div>
  );
}

function EditRestaurantDialog({ restaurant }: { restaurant: Restaurant }) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await updateRestaurant(formData);
      if (!result.ok) {
        setError(result.error);
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
        title="Editar restaurante"
        aria-label="Editar restaurante"
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]"
      >
        <Settings2 className="size-3.5" />
      </button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar restaurante</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={restaurant.id} />

            <div className="space-y-1.5">
              <Label htmlFor={`r-name-${restaurant.id}`}>Nombre</Label>
              <Input
                id={`r-name-${restaurant.id}`}
                name="name"
                defaultValue={restaurant.name}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`r-slug-${restaurant.id}`}>Slug</Label>
              <Input
                id={`r-slug-${restaurant.id}`}
                name="slug"
                defaultValue={restaurant.slug}
                required
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>

            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
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

function ToggleRestaurantButton({ restaurant }: { restaurant: Restaurant }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleRestaurant(restaurant.id, !restaurant.active);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={
        error ??
        (restaurant.active
          ? "Desactivar (deja de redirigir todas sus pulseras)"
          : "Activar")
      }
      aria-label={restaurant.active ? "Desactivar restaurante" : "Activar restaurante"}
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-control border transition-colors " +
        "active:scale-[0.98] disabled:opacity-40 " +
        (error
          ? "border-ex-danger/40 text-ex-danger"
          : restaurant.active
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
