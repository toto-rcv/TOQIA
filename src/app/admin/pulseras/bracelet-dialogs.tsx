"use client";

import { Layers, Plus, Power, Settings2 } from "lucide-react";
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
import {
  createBracelet,
  createBraceletsBulk,
  toggleBracelet,
  updateBracelet,
} from "../actions";

type LocationOption = { id: number; name: string; accountName: string };
type WaiterOption = { id: number; name: string; locationId: number; active: boolean };

/* ── Alta individual ─────────────────────────────────────────────────────── */

export function NewBraceletDialog({
  locations,
  defaultLocationId,
}: {
  locations: LocationOption[];
  defaultLocationId?: number;
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
      const resultado = await createBracelet(formData);
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
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Nueva pulsera
      </Button>

      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva pulsera</DialogTitle>
            <DialogDescription>
              El código es el que se graba en el chip y no se puede repetir en
              todo el sistema.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-code">Código</Label>
                <Input
                  id="b-code"
                  name="code"
                  required
                  placeholder="B001"
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-location">Local</Label>
                <Select
                  id="b-location"
                  name="locationId"
                  required
                  defaultValue={defaultLocationId ? String(defaultLocationId) : ""}
                >
                  <option value="" disabled>
                    Elegí uno…
                  </option>
                  {locations.map((local) => (
                    <option key={local.id} value={local.id}>
                      {local.accountName} · {local.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-label">
                Etiqueta <span className="text-ex-text-disabled">(opcional)</span>
              </Label>
              <Input id="b-label" name="label" placeholder="Mesa 4, Barra…" />
            </div>

            <OverrideField id="b-override" />

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

/* ── Alta masiva ─────────────────────────────────────────────────────────── */

export function BulkCreateDialog({
  locations,
  defaultLocationId,
}: {
  locations: LocationOption[];
  defaultLocationId?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resumen, setResumen] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Preview en vivo del rango: evita generar veinte pulseras mal nombradas.
  const [prefix, setPrefix] = React.useState("B");
  const [start, setStart] = React.useState(1);
  const [count, setCount] = React.useState(20);
  const [padding, setPadding] = React.useState(3);

  const preview = React.useMemo(() => {
    if (count < 1) return "—";
    const primero = `${prefix}${String(start).padStart(padding, "0")}`;
    if (count === 1) return primero;
    const ultimo = `${prefix}${String(start + count - 1).padStart(padding, "0")}`;
    return `${primero} → ${ultimo}`;
  }, [prefix, start, count, padding]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setResumen(null);

    startTransition(async () => {
      const resultado = await createBraceletsBulk(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      const data = resultado.data;
      if (data && data.skipped.length > 0) {
        // No cerramos: el usuario tiene que ver qué se salteó.
        setResumen(
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
          setResumen(null);
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
              Los códigos que ya existan se saltean.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-location">Local</Label>
              <Select
                id="bulk-location"
                name="locationId"
                required
                defaultValue={defaultLocationId ? String(defaultLocationId) : ""}
              >
                <option value="" disabled>
                  Elegí uno…
                </option>
                {locations.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.accountName} · {local.name}
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

            {error ? <ErrorBox message={error} /> : null}
            {resumen ? (
              <p className="rounded-control border border-ex-warning/25 bg-ex-warning/10 px-3 py-2 text-xs text-ex-warning">
                {resumen}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {resumen ? "Cerrar" : "Cancelar"}
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

/* ── Acciones de fila ────────────────────────────────────────────────────── */

export function BraceletRowActions({
  bracelet,
  locations,
  waiters,
}: {
  bracelet: BraceletListItem;
  locations: LocationOption[];
  waiters: WaiterOption[];
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <EditBraceletDialog bracelet={bracelet} locations={locations} waiters={waiters} />
      <ToggleBraceletButton bracelet={bracelet} />
    </div>
  );
}

function EditBraceletDialog({
  bracelet,
  locations,
  waiters,
}: {
  bracelet: BraceletListItem;
  locations: LocationOption[];
  waiters: WaiterOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [locationId, setLocationId] = React.useState(String(bracelet.locationId));

  // Un camarero solo puede tener pulseras de su propio local, así que la lista
  // se filtra por el local elegido en este mismo formulario.
  const camarerosDelLocal = waiters.filter(
    (camarero) => camarero.locationId === Number(locationId)
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await updateBracelet(formData);
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
            <DialogTitle>Editar pulsera {bracelet.code}</DialogTitle>
            <DialogDescription>
              Cambiar el código obliga a regrabar el chip.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={bracelet.id} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`e-code-${bracelet.id}`}>Código</Label>
                <Input
                  id={`e-code-${bracelet.id}`}
                  name="code"
                  defaultValue={bracelet.code}
                  required
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`e-location-${bracelet.id}`}>Local</Label>
                <Select
                  id={`e-location-${bracelet.id}`}
                  name="locationId"
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                >
                  {locations.map((local) => (
                    <option key={local.id} value={local.id}>
                      {local.accountName} · {local.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`e-waiter-${bracelet.id}`}>Camarero</Label>
                <Select
                  id={`e-waiter-${bracelet.id}`}
                  name="waiterId"
                  defaultValue={bracelet.waiterId ? String(bracelet.waiterId) : ""}
                >
                  <option value="">Sin asignar</option>
                  {camarerosDelLocal.map((camarero) => (
                    <option key={camarero.id} value={camarero.id}>
                      {camarero.name}
                      {camarero.active ? "" : " (inactivo)"}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`e-label-${bracelet.id}`}>Etiqueta</Label>
                <Input
                  id={`e-label-${bracelet.id}`}
                  name="label"
                  defaultValue={bracelet.label ?? ""}
                  placeholder="Mesa 4, Barra…"
                />
              </div>
            </div>

            <OverrideField
              id={`e-override-${bracelet.id}`}
              defaultValue={bracelet.overrideUrl ?? ""}
            />

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

function ToggleBraceletButton({ bracelet }: { bracelet: BraceletListItem }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const resultado = await toggleBracelet(bracelet.id, !bracelet.active);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={error ?? (bracelet.active ? "Desactivar pulsera" : "Activar pulsera")}
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

function OverrideField({
  id,
  defaultValue = "",
}: {
  id: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        Destino directo <span className="text-ex-text-disabled">(opcional)</span>
      </Label>
      <Input
        id={id}
        name="overrideUrl"
        defaultValue={defaultValue}
        spellCheck={false}
        placeholder="https://…"
        className="font-mono text-xs"
      />
      <p className="text-[11px] text-ex-text-muted">
        Si lo cargás, esta pulsera saltea la página del local y va directo acá.
        El escaneo se registra igual.
      </p>
    </div>
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
