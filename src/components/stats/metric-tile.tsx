import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLocale } from "next-intl";

import { cn, formatNumber } from "@/lib/utils";

/**
 * Métrica del panel.
 *
 * Orden de lectura: etiqueta arriba (qué estoy mirando), número grande abajo
 * (cuánto), y la variación al pie. La etiqueta va primero porque una cifra
 * sin contexto obliga a bajar la vista y volver a subir.
 *
 * `highlight` pinta la tarjeta principal en tinta oscura: en un tablero claro,
 * invertir el contraste es lo que hace que una de las cuatro se lea primero,
 * sin recurrir a un color de estado que significaría otra cosa.
 */
export function MetricTile({
  value,
  label,
  suffix,
  variation,
  hint,
  highlight = false,
  /** true cuando bajar es bueno (no se usa hoy, pero evita hardcodear el signo). */
  invert = false,
}: {
  value: number | string;
  label: string;
  suffix?: string;
  /** Porcentaje de variación. `null` = el período anterior fue cero. */
  variation?: number | null;
  hint?: string;
  highlight?: boolean;
  invert?: boolean;
}) {
  const locale = useLocale();
  const texto = typeof value === "number" ? formatNumber(value, locale) : value;

  return (
    <div
      className={cn(
        "rounded-card border p-4 sm:p-5",
        highlight
          ? "border-transparent bg-ex-ink text-white shadow-pop"
          : "border-ex-border bg-ex-surface shadow-card"
      )}
    >
      <p
        className={cn(
          "text-[11.5px] font-medium leading-tight",
          highlight ? "text-white/60" : "text-ex-text-muted"
        )}
      >
        {label}
      </p>

      <div className="mt-2 flex items-baseline gap-1">
        <p
          className={cn(
            "text-[28px] font-semibold tabular-nums tracking-tight sm:text-metric",
            highlight ? "text-white" : "text-ex-text"
          )}
        >
          {texto}
        </p>
        {suffix ? (
          <span
            className={cn(
              "text-base font-medium",
              highlight ? "text-white/70" : "text-ex-text-muted"
            )}
          >
            {suffix}
          </span>
        ) : null}
      </div>

      {variation !== undefined ? (
        <VariationBadge value={variation} invert={invert} highlight={highlight} />
      ) : null}

      {hint ? (
        <p
          className={cn(
            "mt-2 text-[11px]",
            highlight ? "text-white/50" : "text-ex-text-disabled"
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

import { useTranslations } from "next-intl";

function VariationBadge({
  value,
  invert,
  highlight,
}: {
  value: number | null;
  invert: boolean;
  highlight: boolean;
}) {
  const t = useTranslations("Stats");

  // Sin base de comparación no inventamos un porcentaje: "subió infinito" no
  // significa nada y confunde más de lo que informa.
  if (value === null) {
    return (
      <p
        className={cn(
          "mt-2.5 flex items-center gap-1 text-[11px]",
          highlight ? "text-white/50" : "text-ex-text-disabled"
        )}
      >
        <Minus className="size-3" aria-hidden />
        {t("sinDatosPeriodoAnterior")}
      </p>
    );
  }

  const redondeado = Math.round(value);
  const sinCambio = redondeado === 0;
  const positivo = invert ? value < 0 : value > 0;

  const Icono = sinCambio ? Minus : positivo ? ArrowUpRight : ArrowDownRight;

  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 font-semibold tabular-nums",
          sinCambio
            ? highlight
              ? "bg-white/10 text-white/70"
              : "bg-ex-elevated text-ex-text-muted"
            : positivo
              ? "bg-ex-success/12 text-ex-success"
              : "bg-ex-danger/12 text-ex-danger"
        )}
      >
        <Icono className="size-3" aria-hidden />
        {sinCambio ? t("igual") : `${Math.abs(redondeado)}%`}
      </span>
      <span className={highlight ? "text-white/50" : "text-ex-text-muted"}>
        {t("vsPeriodoAnterior")}
      </span>
    </p>
  );
}
