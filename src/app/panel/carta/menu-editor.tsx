"use client";

import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  Eye,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
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
import { MenuIcon } from "@/components/landing/menu-icons";
import { FileField } from "@/components/ui/file-field";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { MenuCategoryRow } from "@/db/queries/menu";
import { MENU_ICON_GROUPS } from "@/lib/menu-icons";
import { cn } from "@/lib/utils";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  moveCategory,
  moveItem,
  toggleCategory,
  toggleItemAvailable,
  updateCategory,
  updateItem,
} from "./actions";

/**
 * Editor de la carta.
 *
 * Todo se edita en la misma pantalla, sin navegar: el restaurante suele estar
 * corrigiendo un precio o marcando un plato agotado con el local abierto, y
 * cada pantalla de por medio es tiempo que no tiene.
 */
export function MenuEditor({
  locationId,
  currency,
  categories,
}: {
  locationId: number;
  currency: string;
  categories: MenuCategoryRow[];
}) {
  return (
    <div className="space-y-3">
      {categories.length === 0 ? (
        <div className="rounded-card border border-ex-border bg-ex-surface px-5 py-14 text-center">
          <p className="text-sm text-ex-text-muted">
            Tu carta está vacía. Empezá creando una categoría, por ejemplo
            &ldquo;Entradas&rdquo;.
          </p>
          <div className="mt-4 flex justify-center">
            <NewCategoryDialog locationId={locationId} />
          </div>
        </div>
      ) : (
        categories.map((categoria, index) => (
          <CategoryBlock
            key={categoria.id}
            categoria={categoria}
            locationId={locationId}
            currency={currency}
            esPrimera={index === 0}
            esUltima={index === categories.length - 1}
          />
        ))
      )}
    </div>
  );
}

function CategoryBlock({
  categoria,
  locationId,
  currency,
  esPrimera,
  esUltima,
}: {
  categoria: MenuCategoryRow;
  locationId: number;
  currency: string;
  esPrimera: boolean;
  esUltima: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function correr(accion: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion();
      if (!resultado.ok) setError(resultado.error ?? "No se pudo completar.");
    });
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-ex-border bg-ex-surface",
        !categoria.active && "opacity-60"
      )}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-ex-border-subtle px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <MenuIcon
            name={categoria.icon}
            className="mt-0.5 size-[18px] shrink-0 text-ex-text-secondary"
          />

          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ex-text">
              {categoria.name}
              {!categoria.active ? (
                <span className="ml-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ex-text-muted">
                  oculta
                </span>
              ) : null}
            </h2>
            {categoria.description ? (
              <p className="mt-0.5 text-[12px] text-ex-text-muted">
                {categoria.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            title="Subir"
            disabled={pending || esPrimera}
            onClick={() => correr(() => moveCategory(categoria.id, locationId, "arriba"))}
          >
            <ChevronUp className="size-3.5" />
          </IconButton>
          <IconButton
            title="Bajar"
            disabled={pending || esUltima}
            onClick={() => correr(() => moveCategory(categoria.id, locationId, "abajo"))}
          >
            <ChevronDown className="size-3.5" />
          </IconButton>
          <IconButton
            title={categoria.active ? "Ocultar de la carta" : "Mostrar en la carta"}
            disabled={pending}
            onClick={() =>
              correr(() => toggleCategory(categoria.id, locationId, !categoria.active))
            }
          >
            {categoria.active ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </IconButton>
          <EditCategoryDialog categoria={categoria} locationId={locationId} />
          <DeleteCategoryDialog categoria={categoria} locationId={locationId} />
        </div>
      </header>

      {error ? (
        <p role="alert" className="border-b border-ex-border-subtle px-5 py-2 text-xs text-ex-danger">
          {error}
        </p>
      ) : null}

      {categoria.items.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-ex-text-muted">
          Sin platos en esta categoría.
        </p>
      ) : (
        <ul>
          {categoria.items.map((plato, index) => (
            <ItemRow
              key={plato.id}
              plato={plato}
              categoria={categoria}
              locationId={locationId}
              currency={currency}
              esPrimero={index === 0}
              esUltimo={index === categoria.items.length - 1}
            />
          ))}
        </ul>
      )}

      <div className="border-t border-ex-border-subtle px-5 py-3">
        <NewItemDialog categoryId={categoria.id} locationId={locationId} currency={currency} />
      </div>
    </section>
  );
}

function ItemRow({
  plato,
  categoria,
  locationId,
  currency,
  esPrimero,
  esUltimo,
}: {
  plato: MenuCategoryRow["items"][number];
  categoria: MenuCategoryRow;
  locationId: number;
  currency: string;
  esPrimero: boolean;
  esUltimo: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function correr(accion: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion();
      if (!resultado.ok) setError(resultado.error ?? "No se pudo completar.");
    });
  }

  return (
    <li className="ex-card-flush flex items-center gap-3 px-4 py-3 sm:px-5">
      {plato.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={plato.imageUrl}
          alt=""
          className="size-11 shrink-0 rounded-control object-cover"
        />
      ) : (
        <div className="size-11 shrink-0 rounded-control border border-dashed border-ex-border" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "truncate text-[14px] font-medium text-ex-text",
              !plato.available && "line-through opacity-60"
            )}
          >
            {plato.name}
          </span>
          {plato.price ? (
            // Mismo formato que ve el cliente: sin el ".00" cuando es redondo.
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ex-text-secondary">
              {formatearPrecio(plato.price, currency)}
            </span>
          ) : null}
        </div>

        {plato.description ? (
          <p className="mt-0.5 truncate text-[12px] text-ex-text-muted">
            {plato.description}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-1 text-[11px] text-ex-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <IconButton
          title="Subir"
          disabled={pending || esPrimero}
          onClick={() => correr(() => moveItem(plato.id, locationId, "arriba"))}
        >
          <ChevronUp className="size-3.5" />
        </IconButton>
        <IconButton
          title="Bajar"
          disabled={pending || esUltimo}
          onClick={() => correr(() => moveItem(plato.id, locationId, "abajo"))}
        >
          <ChevronDown className="size-3.5" />
        </IconButton>
        <IconButton
          title={plato.available ? "Marcar como agotado" : "Volver a ofrecer"}
          disabled={pending}
          onClick={() =>
            correr(() => toggleItemAvailable(plato.id, locationId, !plato.available))
          }
        >
          {plato.available ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </IconButton>
        <EditItemDialog
          plato={plato}
          categoria={categoria}
          locationId={locationId}
          currency={currency}
        />
        <DeleteItemDialog plato={plato} locationId={locationId} />
      </div>
    </li>
  );
}

/* ── Diálogos ────────────────────────────────────────────────────────────── */

export function NewCategoryDialog({ locationId }: { locationId: number }) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await createCategory(formData);
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
        Nueva categoría
      </Button>

      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>
              Entradas, Principales, Postres, Bebidas…
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="locationId" value={locationId} />

            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input id="cat-name" name="name" required placeholder="Entradas" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">
                Descripción <span className="text-ex-text-disabled">(opcional)</span>
              </Label>
              <Input
                id="cat-desc"
                name="description"
                placeholder="Para compartir"
              />
            </div>

            <SelectorDeIcono />

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

function EditCategoryDialog({
  categoria,
  locationId,
}: {
  categoria: MenuCategoryRow;
  locationId: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await updateCategory(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <IconButton title="Editar categoría" onClick={() => setOpen(true)}>
        <Settings2 className="size-3.5" />
      </IconButton>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={categoria.id} />
            <input type="hidden" name="locationId" value={locationId} />

            <div className="space-y-1.5">
              <Label htmlFor={`c-name-${categoria.id}`}>Nombre</Label>
              <Input
                id={`c-name-${categoria.id}`}
                name="name"
                defaultValue={categoria.name}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`c-desc-${categoria.id}`}>Descripción</Label>
              <Input
                id={`c-desc-${categoria.id}`}
                name="description"
                defaultValue={categoria.description ?? ""}
              />
            </div>

            <SelectorDeIcono inicial={categoria.icon} />

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

function DeleteCategoryDialog({
  categoria,
  locationId,
}: {
  categoria: MenuCategoryRow;
  locationId: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <IconButton title="Borrar categoría" danger onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" />
      </IconButton>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar &ldquo;{categoria.name}&rdquo;</DialogTitle>
          <DialogDescription>
            {/* Se dice el número exacto: no es lo mismo perder una categoría
                vacía que una con veinte platos cargados. */}
            Se borran también sus {categoria.items.length}{" "}
            {categoria.items.length === 1 ? "plato" : "platos"}. No se puede
            deshacer. Si solo querés sacarla de la carta, usá el ojo para
            ocultarla.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>{error ? <ErrorBox message={error} /> : null}</DialogBody>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const resultado = await deleteCategory(categoria.id, locationId);
                if (!resultado.ok) {
                  setError(resultado.error);
                  return;
                }
                setOpen(false);
              });
            }}
          >
            {pending ? "Borrando…" : "Borrar igual"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewItemDialog({
  categoryId,
  locationId,
  currency,
}: {
  categoryId: number;
  locationId: number;
  currency: string;
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
      const resultado = await createItem(formData);
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Agregar plato
      </Button>

      <DialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo plato</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="categoryId" value={categoryId} />
            <input type="hidden" name="locationId" value={locationId} />
            <ItemFields currency={currency} />
            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Agregando…" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({
  plato,
  categoria,
  locationId,
  currency,
}: {
  plato: MenuCategoryRow["items"][number];
  categoria: MenuCategoryRow;
  locationId: number;
  currency: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await updateItem(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <IconButton title="Editar plato" onClick={() => setOpen(true)}>
        <Settings2 className="size-3.5" />
      </IconButton>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar plato</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={plato.id} />
            <input type="hidden" name="locationId" value={locationId} />
            <input type="hidden" name="categoryId" value={categoria.id} />
            <ItemFields currency={currency} plato={plato} />
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

function DeleteItemDialog({
  plato,
  locationId,
}: {
  plato: MenuCategoryRow["items"][number];
  locationId: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <IconButton title="Borrar plato" danger onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" />
      </IconButton>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar &ldquo;{plato.name}&rdquo;</DialogTitle>
          <DialogDescription>
            No se puede deshacer. Si es algo que se agotó hoy, mejor marcalo
            como agotado con el ojo: se sigue viendo y podés reactivarlo mañana.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>{error ? <ErrorBox message={error} /> : null}</DialogBody>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const resultado = await deleteItem(plato.id, locationId);
                if (!resultado.ok) {
                  setError(resultado.error);
                  return;
                }
                setOpen(false);
              });
            }}
          >
            {pending ? "Borrando…" : "Borrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemFields({
  currency,
  plato,
}: {
  currency: string;
  plato?: MenuCategoryRow["items"][number];
}) {
  const id = plato?.id ?? "nuevo";

  return (
    <>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`i-name-${id}`}>Nombre</Label>
          <Input
            id={`i-name-${id}`}
            name="name"
            defaultValue={plato?.name ?? ""}
            required
            placeholder="Burrata con tomate"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`i-price-${id}`}>Precio ({currency})</Label>
          <Input
            id={`i-price-${id}`}
            name="price"
            defaultValue={plato?.price ?? ""}
            placeholder="12"
            inputMode="decimal"
            className="font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`i-desc-${id}`}>
          Descripción <span className="text-ex-text-disabled">(opcional)</span>
        </Label>
        <Textarea
          id={`i-desc-${id}`}
          name="description"
          rows={2}
          defaultValue={plato?.description ?? ""}
          placeholder="Con tomate de estación y albahaca"
        />
      </div>

      <FileField
        name="image"
        label="Foto del plato (opcional)"
        actual={plato?.imageUrl ?? null}
        formato="imagen"
        hint="Se ve cuadrada al lado del nombre. Una foto del plato solo, bien iluminada, funciona mejor que una de la mesa entera."
      />
    </>
  );
}

/* ── Selector de ícono ───────────────────────────────────────────────────── */

/**
 * Elegir el dibujito que acompaña al nombre de la categoría.
 *
 * Es una grilla de botones y no un desplegable a propósito: el ícono se elige
 * mirándolo. En una lista de nombres ("empanada", "picada") habría que
 * imaginarse cada uno.
 *
 * Lo que viaja al servidor es el id, en un input oculto. El servidor igual lo
 * valida contra el catálogo: nunca se guarda lo que llegó sin revisar.
 */
function SelectorDeIcono({ inicial }: { inicial?: string | null }) {
  const [elegido, setElegido] = React.useState<string | null>(inicial ?? null);

  return (
    <div className="space-y-2">
      {/* No es un <label>: no hay un control único al que apuntar, son
          veintisiete botones. El grupo se anuncia por el texto de arriba. */}
      <p className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-ex-text-muted">
        Ícono <span className="normal-case text-ex-text-disabled">(opcional)</span>
      </p>

      <div className="max-h-[188px] space-y-3 overflow-y-auto rounded-control border border-ex-border p-3">
        {MENU_ICON_GROUPS.map((grupo) => (
          <div key={grupo.label}>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ex-text-muted">
              {grupo.label}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {grupo.icons.map((icono) => {
                const activo = elegido === icono.id;

                return (
                  <button
                    key={icono.id}
                    type="button"
                    title={icono.label}
                    aria-label={icono.label}
                    aria-pressed={activo}
                    // Volver a tocar el que ya está elegido lo saca: es la
                    // forma más natural de decir "ninguno".
                    onClick={() => setElegido(activo ? null : icono.id)}
                    className={cn(
                      "grid size-10 place-items-center rounded-control border transition-colors",
                      activo
                        ? "border-ex-blue bg-ex-blue-wash text-ex-blue-deep"
                        : "border-ex-border text-ex-text-secondary hover:border-ex-blue/45 hover:text-ex-text"
                    )}
                  >
                    <MenuIcon name={icono.id} className="size-[18px]" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ex-text-muted">
        {elegido
          ? "Se muestra al lado del nombre en la carta. Tocalo de nuevo para sacarlo."
          : "Sin ícono, la categoría se muestra solo con su nombre."}
      </p>

      <input type="hidden" name="icon" value={elegido ?? ""} />
    </div>
  );
}

/* ── Piezas chicas ───────────────────────────────────────────────────────── */

function IconButton({
  title,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-control border",
        "border-ex-border text-ex-text-muted transition-colors duration-150",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30",
        danger
          ? "hover:border-ex-danger/40 hover:text-ex-danger"
          : "hover:border-ex-blue/40 hover:text-ex-text"
      )}
    >
      {children}
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

/** Igual que en la carta pública: "$6500" y no "6500.00 $". */
function formatearPrecio(price: string, currency: string): string {
  const numero = Number(price);
  if (!Number.isFinite(numero)) return `${price} ${currency}`;

  const texto = Number.isInteger(numero)
    ? String(numero)
    : numero.toFixed(2).replace(".", ",");

  return `${currency}${texto}`;
}
