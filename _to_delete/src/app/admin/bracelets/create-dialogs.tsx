"use client";

import { Layers, Plus } from "lucide-react";
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
import { createBracelet, createBraceletsBulk } from "./actions";

type RestaurantOption = { id: number; name: string; active: boolean };

/* ── Alta individual ─────────────────────────────────────────────────────── */

export function NewBraceletDialog({
  restaurants,
  defaultRestaurantId,
}: {
  restaurants: RestaurantOption[];
  defaultRestaurantId?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createBracelet(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Nueva pulsera
      </Button>

      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva pulsera</DialogTitle>
            <DialogDescription>
              El código es el que se graba en el chip y no se puede repetir.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-code">Código</Label>
                <Input
                  id="new-code"
                  name="code"
                  required
                  placeholder="B001"
                  spellCheck={false}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-restaurant">Restaurante</Label>
                <Select
                  id="new-restaurant"
                  name="restaurantId"
                  defaultValue={defaultRestaurantId ? String(defaultRestaurantId) : ""}
                  required
                >
                  <option value="" disabled>
                    Elegí uno…
                  </option>
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
              <Label htmlFor="new-label">
                Etiqueta <span className="text-ex-text-disabled">(opcional)</span>
              </Label>
              <Input id="new-label" name="label" placeholder="Mesa 4, Barra…" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-destination">Destino</Label>
              <Input
                id="new-destination"
                name="destinationUrl"
                required
                spellCheck={false}
                placeholder="https://g.page/r/CODIGO/review"
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
              {pending ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Alta masiva ─────────────────────────────────────────────────────────── */

export function BulkCreateDialog({
  restaurants,
  defaultRestaurantId,
}: {
  restaurants: RestaurantOption[];
  defaultRestaurantId?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Preview en vivo del rango: evita generar 20 pulseras con el nombre mal.
  const [prefix, setPrefix] = React.useState("B");
  const [start, setStart] = React.useState(1);
  const [count, setCount] = React.useState(20);
  const [padding, setPadding] = React.useState(3);

  const preview = React.useMemo(() => {
    if (count < 1) return "—";
    const first = `${prefix}${String(start).padStart(padding, "0")}`;
    if (count === 1) return first;
    const last = `${prefix}${String(start + count - 1).padStart(padding, "0")}`;
    return `${first} → ${last}`;
  }, [prefix, start, count, padding]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setSummary(null);

    startTransition(async () => {
      const result = await createBraceletsBulk(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const data = result.data;
      if (data && data.skipped.length > 0) {
        // No cerramos el diálogo: el usuario tiene que ver qué se salteó.
        setSummary(
          `Se crearon ${data.created} pulseras. Se saltearon ${data.skipped.length} porque ya existían: ${data.skipped.slice(0, 8).join(", ")}${data.skipped.length > 8 ? "…" : ""}`
        );
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
        if (!next) {
          setError(null);
          setSummary(null);
        }
      }}
    >
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Layers />
        Alta masiva
      </Button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Generar lote de pulseras</DialogTitle>
            <DialogDescription>
              Crea pulseras con numeración correlativa. Los códigos que ya
              existan se saltean.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-restaurant">Restaurante</Label>
              <Select
                id="bulk-restaurant"
                name="restaurantId"
                defaultValue={defaultRestaurantId ? String(defaultRestaurantId) : ""}
                required
              >
                <option value="" disabled>
                  Elegí uno…
                </option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                    {restaurant.active ? "" : " (inactivo)"}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-prefix">Prefijo</Label>
                <Input
                  id="bulk-prefix"
                  name="prefix"
                  value={prefix}
                  onChange={(event) => setPrefix(event.target.value)}
                  required
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-start">Desde</Label>
                <Input
                  id="bulk-start"
                  name="start"
                  type="number"
                  min={0}
                  value={start}
                  onChange={(event) => setStart(Number(event.target.value))}
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-count">Cantidad</Label>
                <Input
                  id="bulk-count"
                  name="count"
                  type="number"
                  min={1}
                  max={500}
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-padding">Dígitos</Label>
                <Input
                  id="bulk-padding"
                  name="padding"
                  type="number"
                  min={0}
                  max={10}
                  value={padding}
                  onChange={(event) => setPadding(Number(event.target.value))}
                  required
                  className="font-mono"
                />
              </div>
            </div>

            <div className="rounded-control border border-ex-border bg-ex-black px-3 py-2">
              <p className="ex-label mb-1">Se van a generar</p>
              <p className="font-mono text-sm text-ex-blue-bright">{preview}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-destination">Destino inicial (para todas)</Label>
              <Input
                id="bulk-destination"
                name="destinationUrl"
                required
                spellCheck={false}
                placeholder="https://g.page/r/CODIGO/review"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-ex-text-muted">
                Después se puede cambiar una por una desde la tabla.
              </p>
            </div>

            {error ? <ErrorBox message={error} /> : null}
            {summary ? (
              <p className="rounded-control border border-ex-warning/25 bg-ex-warning/10 px-3 py-2 text-xs text-ex-warning">
                {summary}
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
              {summary ? "Cerrar" : "Cancelar"}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Generando…" : "Generar"}
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
