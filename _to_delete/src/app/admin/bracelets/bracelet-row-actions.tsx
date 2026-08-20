"use client";

import { Power, Settings2 } from "lucide-react";
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
import type { BraceletListItem } from "@/db/queries/bracelets";
import { toggleBracelet, updateBracelet } from "./actions";

type RestaurantOption = { id: number; name: string; active: boolean };

export function BraceletRowActions({
  bracelet,
  restaurants,
}: {
  bracelet: BraceletListItem;
  restaurants: RestaurantOption[];
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <EditBraceletDialog bracelet={bracelet} restaurants={restaurants} />
      <ToggleButton bracelet={bracelet} />
    </div>
  );
}

function ToggleButton({ bracelet }: { bracelet: BraceletListItem }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleBracelet(bracelet.id, !bracelet.active);
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
        (bracelet.active ? "Desactivar pulsera" : "Activar pulsera")
      }
      aria-label={bracelet.active ? "Desactivar pulsera" : "Activar pulsera"}
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-control border transition-colors " +
        "active:scale-[0.98] disabled:opacity-40 " +
        (error
          ? "border-ex-danger/40 text-ex-danger"
          : bracelet.active
            ? "border-ex-border text-ex-text-muted hover:border-ex-danger/40 hover:text-ex-danger"
            : "border-ex-border text-ex-text-muted hover:border-ex-success/40 hover:text-ex-success")
      }
    >
      <Power className="size-3.5" />
    </button>
  );
}

function EditBraceletDialog({
  bracelet,
  restaurants,
}: {
  bracelet: BraceletListItem;
  restaurants: RestaurantOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await updateBracelet(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Editar pulsera"
        aria-label="Editar pulsera"
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]"
      >
        <Settings2 className="size-3.5" />
      </button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar pulsera</DialogTitle>
            <DialogDescription>
              Cambiar el código obliga a regrabar el chip. Si solo querés
              cambiar a dónde lleva, editá el destino desde la tabla.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={bracelet.id} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`code-${bracelet.id}`}>Código</Label>
                <Input
                  id={`code-${bracelet.id}`}
                  name="code"
                  defaultValue={bracelet.code}
                  required
                  spellCheck={false}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`restaurant-${bracelet.id}`}>Restaurante</Label>
                <Select
                  id={`restaurant-${bracelet.id}`}
                  name="restaurantId"
                  defaultValue={String(bracelet.restaurantId)}
                >
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                      {restaurant.active ? "" : " (inactivo)"}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`label-${bracelet.id}`}>
                Etiqueta <span className="text-ex-text-disabled">(opcional)</span>
              </Label>
              <Input
                id={`label-${bracelet.id}`}
                name="label"
                defaultValue={bracelet.label ?? ""}
                placeholder="Mesa 4, Barra, Terraza…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`destination-${bracelet.id}`}>Destino</Label>
              <Input
                id={`destination-${bracelet.id}`}
                name="destinationUrl"
                defaultValue={bracelet.destinationUrl}
                required
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>

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
