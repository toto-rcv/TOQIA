import * as React from "react";

/**
 * Encabezado de página.
 *
 * En celular el título va arriba y las acciones abajo, a lo ancho: un botón
 * de 44px que ocupa la fila entera es más fácil de tocar que uno chico
 * apretado contra el borde derecho.
 */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-ex-text sm:text-2xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] leading-relaxed text-ex-text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>

      {children ? (
        <div
          className="flex shrink-0 flex-wrap items-center gap-2
                     [&>*]:max-sm:flex-1 [&>*]:max-sm:justify-center"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
