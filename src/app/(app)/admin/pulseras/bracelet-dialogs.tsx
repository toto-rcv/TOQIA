"use client";

import { Layers, Plus, Power, Settings2, Trash2 } from "lucide-react";
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
import type { BraceletListItem } from "@/db/queries/bracelets";
import {
  createBracelet,
  createBraceletsBulk,
  deleteBracelet,
  toggleBracelet,
  updateBracelet,
} from "../actions";

type LocationOption = { id: number; name: string; accountName: string };
type WaiterOption = { id: number; name: string; locationId: number; active: boolean };
type DistributorOption = { id: string; name: string; email: string };

/* ── Destino ─────────────────────────────────────────────────────────────── */

/**
 * Dónde está la pulsera: en un local, en el stock de un distribuidor, o en el
 * de Toqia.
 *
 * Es un solo desplegable y no dos campos excluyentes: así no existe el estado
 * imposible de "en un local y en un stock a la vez", y el recorrido físico
 * Toqia → distribuidor → local se lee de arriba hacia abajo en la lista.
 */
const DESTINO_STOCK = "stock";

function valorDeDestino(
  locationId: number | null,
  distributorId: string | null
): string {
  if (locationId) return `local:${locationId}`;
  if (distributorId) return `distribuidor:${distributorId}`;
  return DESTINO_STOCK;
}

/** El local elegido, o null si el destino es un stock. */
function localDeDestino(destino: string): number | null {
  return destino.startsWith("local:")
    ? Number(destino.slice("local:".length))
    : null;
}

function DestinoSelect({
  id,
  locations,
  distributors,
  value,
  onChange,
}: {
  id: string;
  locations: LocationOption[];
  distributors: DistributorOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Pulseras");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t("destino")}</Label>
      <Select id={id} name="destino" value={value} onChange={(e) => onChange(e.target.value)}>
        <optgroup label={t("sinColocar")}>
          <option value={DESTINO_STOCK}>{t("stockDeToqia")}</option>
          {distributors.map((distribuidor) => (
            <option key={distribuidor.id} value={`distribuidor:${distribuidor.id}`}>
              {t("stockDe", { nombre: distribuidor.name })}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("enUnLocal")}>
          {locations.map((local) => (
            <option key={local.id} value={`local:${local.id}`}>
              {local.accountName} · {local.name}
            </option>
          ))}
        </optgroup>
      </Select>
    </div>
  );
}

/* ── Alta individual ─────────────────────────────────────────────────────── */

export function NewBraceletDialog({
  locations,
  distributors,
  defaultLocationId,
}: {
  locations: LocationOption[];
  distributors: DistributorOption[];
  defaultLocationId?: number;
}) {
  const t = useTranslations("Pulseras");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [destino, setDestino] = React.useState(
    defaultLocationId ? `local:${defaultLocationId}` : DESTINO_STOCK
  );

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
        {t("nueva")}
      </Button>

      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("nueva")}</DialogTitle>
            <DialogDescription>{t("nuevaDesc")}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-code">{t("colCodigo")}</Label>
                <Input
                  id="b-code"
                  name="code"
                  required
                  placeholder="B001"
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
              <DestinoSelect
                id="b-destino"
                locations={locations}
                distributors={distributors}
                value={destino}
                onChange={setDestino}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-type">{t("tipo")}</Label>
                <Select id="b-type" name="deviceType" defaultValue="pulsera">
                  <option value="pulsera">{t("unaPulsera")}</option>
                  <option value="placa">{t("unaPlaca")}</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-label">
                  {t("colEtiqueta")}{" "}
                  <span className="text-ex-text-disabled">{t("opcional")}</span>
                </Label>
                <Input
                  id="b-label"
                  name="label"
                  placeholder={t("etiquetaPlaceholder")}
                />
              </div>
            </div>

            <OverrideField id="b-override" />

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

/* ── Alta masiva ─────────────────────────────────────────────────────────── */

export function BulkCreateDialog({
  locations,
  distributors,
  defaultLocationId,
}: {
  locations: LocationOption[];
  distributors: DistributorOption[];
  defaultLocationId?: number;
}) {
  const t = useTranslations("Pulseras");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resumen, setResumen] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Preview en vivo del rango: evita generar veinte pulseras mal nombradas.
  const [prefix, setPrefix] = React.useState("B");
  const [start, setStart] = React.useState(1);
  const [count, setCount] = React.useState(20);
  const [padding, setPadding] = React.useState(3);
  const [destino, setDestino] = React.useState(
    defaultLocationId ? `local:${defaultLocationId}` : DESTINO_STOCK
  );

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
          t("resumenLote", {
            creadas: data.created,
            salteadas: data.skipped.length,
            codigos:
              data.skipped.slice(0, 8).join(", ") +
              (data.skipped.length > 8 ? "…" : ""),
          })
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
        {t("altaMasiva")}
      </Button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("generarLote")}</DialogTitle>
            <DialogDescription>{t("generarLoteDesc")}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <DestinoSelect
              id="bulk-destino"
              locations={locations}
              distributors={distributors}
              value={destino}
              onChange={setDestino}
            />

            <div className="space-y-1.5">
              <Label htmlFor="bulk-type">{t("tipoDeDispositivo")}</Label>
              <Select id="bulk-type" name="deviceType" defaultValue="pulsera">
                <option value="pulsera">{t("titulo")}</option>
                <option value="placa">{t("placas")}</option>
              </Select>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-prefix">{t("prefijo")}</Label>
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
                <Label htmlFor="bulk-start">{t("desde")}</Label>
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
                <Label htmlFor="bulk-count">{t("cantidad")}</Label>
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
                <Label htmlFor="bulk-padding">{t("digitos")}</Label>
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
              <p className="ex-label mb-1">{t("seVanAGenerar")}</p>
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
              {resumen ? t("cerrar") : t("cancelar")}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? t("generando") : t("generar")}
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
  distributors,
  waiters,
}: {
  bracelet: BraceletListItem;
  locations: LocationOption[];
  distributors: DistributorOption[];
  waiters: WaiterOption[];
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <EditBraceletDialog
        bracelet={bracelet}
        locations={locations}
        distributors={distributors}
        waiters={waiters}
      />
      <ToggleBraceletButton bracelet={bracelet} />
      <DeleteBraceletDialog bracelet={bracelet} />
    </div>
  );
}

function EditBraceletDialog({
  bracelet,
  locations,
  distributors,
  waiters,
}: {
  bracelet: BraceletListItem;
  locations: LocationOption[];
  distributors: DistributorOption[];
  waiters: WaiterOption[];
}) {
  const t = useTranslations("Pulseras");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [destino, setDestino] = React.useState(
    valorDeDestino(bracelet.locationId, bracelet.distributorId)
  );

  // Un camarero solo puede tener pulseras de su propio local, así que la lista
  // se filtra por el local elegido en este mismo formulario. Si el destino es
  // un stock no hay local, y no hay camareros para elegir.
  const localElegido = localDeDestino(destino);
  const camarerosDelLocal =
    localElegido === null
      ? []
      : waiters.filter((camarero) => camarero.locationId === localElegido);

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
            <DialogTitle>{t("editarCodigo", { code: bracelet.code })}</DialogTitle>
            <DialogDescription>{t("editarDesc")}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={bracelet.id} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`e-code-${bracelet.id}`}>{t("colCodigo")}</Label>
                <Input
                  id={`e-code-${bracelet.id}`}
                  name="code"
                  defaultValue={bracelet.code}
                  required
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
              <DestinoSelect
                id={`e-destino-${bracelet.id}`}
                locations={locations}
                distributors={distributors}
                value={destino}
                onChange={setDestino}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`e-waiter-${bracelet.id}`}>{t("colCamarero")}</Label>
                <Select
                  id={`e-waiter-${bracelet.id}`}
                  name="waiterId"
                  defaultValue={bracelet.waiterId ? String(bracelet.waiterId) : ""}
                  disabled={localElegido === null}
                >
                  <option value="">{t("sinAsignar")}</option>
                  {camarerosDelLocal.map((camarero) => (
                    <option key={camarero.id} value={camarero.id}>
                      {camarero.name}
                      {camarero.active ? "" : ` ${t("camareroInactivo")}`}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`e-label-${bracelet.id}`}>{t("colEtiqueta")}</Label>
                <Input
                  id={`e-label-${bracelet.id}`}
                  name="label"
                  defaultValue={bracelet.label ?? ""}
                  placeholder={t("etiquetaPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`e-type-${bracelet.id}`}>
                {t("tipoDeDispositivo")}
              </Label>
              <Select
                id={`e-type-${bracelet.id}`}
                name="deviceType"
                defaultValue={bracelet.deviceType}
              >
                <option value="pulsera">{t("unaPulsera")}</option>
                <option value="placa">{t("unaPlaca")}</option>
              </Select>
            </div>

            <OverrideField
              id={`e-override-${bracelet.id}`}
              defaultValue={bracelet.overrideUrl ?? ""}
            />

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

function ToggleBraceletButton({ bracelet }: { bracelet: BraceletListItem }) {
  const t = useTranslations("Pulseras");
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
      title={error ?? (bracelet.active ? t("desactivar") : t("activar"))}
      aria-label={bracelet.active ? t("desactivar") : t("activar")}
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

function DeleteBraceletDialog({ bracelet }: { bracelet: BraceletListItem }) {
  const t = useTranslations("Pulseras");
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
          <DialogTitle>{t("borrarCodigo", { code: bracelet.code })}</DialogTitle>
          <DialogDescription>
            {t("borrarPulseraDesc", { n: bracelet.scanCount })}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>{error ? <ErrorBox message={error} /> : null}</DialogBody>

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
                const resultado = await deleteBracelet(bracelet.id);
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

function OverrideField({
  id,
  defaultValue = "",
}: {
  id: string;
  defaultValue?: string;
}) {
  const t = useTranslations("Pulseras");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {t("destinoDirecto")}{" "}
        <span className="text-ex-text-disabled">{t("opcional")}</span>
      </Label>
      <Input
        id={id}
        name="overrideUrl"
        defaultValue={defaultValue}
        spellCheck={false}
        placeholder="https://…"
        className="font-mono text-xs"
      />
      <p className="text-[11px] text-ex-text-muted">{t("destinoDirectoHint")}</p>
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
