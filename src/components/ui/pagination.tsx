import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Paged } from "@/lib/pagination";
import { formatNumber } from "@/lib/utils";

/**
 * Paginador de un listado servido desde el backend.
 *
 * Cada número es un `<Link>` real a `?page=N`. Eso importa: al tocarlo, Next
 * vuelve a ejecutar la página en el servidor y la consulta trae **solo** esas
 * diez filas. No hay nada guardado en el cliente que se esté filtrando ni una
 * lista completa escondida — la página 2 no existe hasta que alguien la pide.
 *
 * Como son enlaces, además funciona el botón de atrás del navegador, se puede
 * compartir la URL de una página concreta y anda sin JavaScript.
 */
import { useTranslations } from "next-intl";

export function Pagination({
  paged,
  basePath,
  searchParams,
  /** Cómo se llama lo que se está listando: "pulseras", "escaneos"… */
  itemLabel,
  className,
}: {
  paged: Pick<Paged<unknown>, "page" | "limit" | "total" | "totalPages">;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  itemLabel: string;
  className?: string;
}) {
  const t = useTranslations("Paginacion");
  const { page, limit, total, totalPages } = paged;

  // Con una sola página el paginador no aporta nada; se muestra el conteo,
  // que sí sirve para saber cuánto hay.
  const desde = total === 0 ? 0 : (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);

  function href(destino: number): string {
    const query = new URLSearchParams();
    for (const [clave, valor] of Object.entries(searchParams)) {
      if (clave === "page") continue;
      const texto = Array.isArray(valor) ? valor[0] : valor;
      if (texto) query.set(clave, texto);
    }
    if (destino > 1) query.set("page", String(destino));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-ex-border-subtle px-4 py-3.5",
        "sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className
      )}
    >
      <p className="text-[12.5px] text-ex-text-muted">
        {total === 0 ? (
          <>{t("sinItems", { itemLabel })}</>
        ) : (
          <>{t("rangoDeTotal", { desde: formatNumber(desde), hasta: formatNumber(hasta), total: formatNumber(total), itemLabel })}</>
        )}
      </p>

      {totalPages > 1 ? (
        <nav className="flex items-center gap-1.5" aria-label={t("ariaLabel")}>
          <Flecha
            href={href(page - 1)}
            disabled={page <= 1}
            label={t("anterior")}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Flecha>

          {/* En celular, el rango de números se reemplaza por "3 / 12": diez
              cuadraditos no entran sin desbordar. */}
          <span className="px-2 text-[13px] font-medium text-ex-text-secondary sm:hidden">
            {page} / {totalPages}
          </span>

          <ul className="hidden items-center gap-1 sm:flex">
            {numeros(page, totalPages).map((n, i) =>
              n === null ? (
                <li
                  key={`gap-${i}`}
                  aria-hidden
                  className="px-1 text-[13px] text-ex-text-disabled"
                >
                  …
                </li>
              ) : (
                <li key={n}>
                  <Link
                    href={href(n)}
                    aria-current={n === page ? "page" : undefined}
                    className={cn(
                      "grid h-9 min-w-9 place-items-center rounded-control px-2 text-[13px]",
                      "font-medium transition-colors duration-150",
                      n === page
                        ? "bg-ex-blue text-white"
                        : "text-ex-text-secondary hover:bg-ex-elevated hover:text-ex-text"
                    )}
                  >
                    {n}
                  </Link>
                </li>
              )
            )}
          </ul>

          <Flecha
            href={href(page + 1)}
            disabled={page >= totalPages}
            label={t("siguiente")}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Flecha>
        </nav>
      ) : null}
    </div>
  );
}

function Flecha({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const clases =
    "grid h-9 w-9 place-items-center rounded-control border border-ex-border " +
    "transition-colors duration-150";

  // Deshabilitado se dibuja como <span>, no como enlace apagado: un <a> sin
  // destino sigue siendo enfocable y confunde a un lector de pantalla.
  if (disabled) {
    return (
      <span
        aria-hidden
        className={cn(clases, "cursor-not-allowed text-ex-text-disabled opacity-50")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        clases,
        "bg-ex-surface text-ex-text-secondary hover:border-ex-blue/45 hover:text-ex-text"
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Qué números mostrar. Siempre la primera, la última, y una ventana alrededor
 * de la actual; `null` marca dónde va el "…".
 */
function numeros(actual: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const salida: (number | null)[] = [1];
  const desde = Math.max(2, actual - 1);
  const hasta = Math.min(total - 1, actual + 1);

  if (desde > 2) salida.push(null);
  for (let n = desde; n <= hasta; n += 1) salida.push(n);
  if (hasta < total - 1) salida.push(null);

  salida.push(total);
  return salida;
}
