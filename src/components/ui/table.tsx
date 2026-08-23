import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tabla del panel.
 *
 * **En celular no hay tabla.** Una tabla de ocho columnas comprimida a 360px
 * es ilegible con scroll horizontal o sin él, así que cada pantalla dibuja
 * dos cosas: la tabla (`hidden sm:block`) y una lista de tarjetas
 * (`sm:hidden`) con los mismos datos ordenados por importancia. Es más HTML,
 * pero es la única forma de que la versión móvil sea usable de verdad y no
 * una versión de escritorio apretada.
 *
 * `RowCard` y `RowField` son las piezas de esa lista, para que todas las
 * pantallas se vean iguales sin copiar clases.
 */

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function Thead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-ex-border bg-ex-navy/60", className)}
      {...props}
    />
  );
}

export function Th({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase",
        "tracking-[0.06em] text-ex-text-muted",
        className
      )}
      {...props}
    />
  );
}

export function Tr({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-ex-border-subtle transition-colors last:border-b-0 hover:bg-ex-elevated",
        className
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-ex-text-secondary", className)}
      {...props}
    />
  );
}

/* ── Versión móvil ────────────────────────────────────────────────────────── */

/** Una fila de la tabla, dibujada como tarjeta para el celular. */
export function RowCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn(
        "border-b border-ex-border-subtle px-4 py-3.5 last:border-b-0",
        className
      )}
      {...props}
    >
      {children}
    </li>
  );
}

/** Etiqueta + valor dentro de una `RowCard`. */
export function RowField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ex-text-muted">
        {label}
      </p>
      <div className="mt-0.5 text-[13px] text-ex-text-secondary">{children}</div>
    </div>
  );
}

/** Grilla de dos columnas para los campos secundarios de una `RowCard`. */
export function RowFields({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-3 grid grid-cols-2 gap-3", className)} {...props} />;
}

export function EmptyState({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center sm:py-20">
      {icon ? (
        <div
          aria-hidden
          className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-ex-elevated
                     text-ex-text-disabled"
        >
          {icon}
        </div>
      ) : null}
      <div className="mx-auto max-w-sm text-sm leading-relaxed text-ex-text-muted">
        {children}
      </div>
    </div>
  );
}
