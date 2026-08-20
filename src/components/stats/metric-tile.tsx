import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardBody } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Métrica del panel.
 *
 * El número manda: va primero, grande y en mono tabular. La etiqueta va
 * debajo, chica y apagada. La variación contra el período anterior es un
 * indicador secundario y nunca compite con la cifra.
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
  const texto = typeof value === "number" ? formatNumber(value) : value;

  return (
    <Card>
      <CardBody>
        <div className="flex items-baseline gap-1">
          <p
            className={cn(
              "font-mono text-metric font-medium tabular-nums",
              highlight ? "text-ex-blue-bright" : "text-ex-text"
            )}
          >
            {texto}
          </p>
          {suffix ? (
            <span className="font-mono text-sm text-ex-text-muted">{suffix}</span>
          ) : null}
        </div>

        <p className="ex-label mt-1.5">{label}</p>

        {variation !== undefined ? (
          <VariationBadge value={variation} invert={invert} />
        ) : null}

        {hint ? (
          <p className="mt-2 text-[11px] text-ex-text-disabled">{hint}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function VariationBadge({
  value,
  invert,
}: {
  value: number | null;
  invert: boolean;
}) {
  // Sin base de comparación no inventamos un porcentaje: "subió infinito" no
  // significa nada y confunde más de lo que informa.
  if (value === null) {
    return (
      <p className="mt-2 flex items-center gap-1 text-[11px] text-ex-text-disabled">
        <Minus className="size-3" aria-hidden />
        sin datos del período anterior
      </p>
    );
  }

  const redondeado = Math.round(value);
  const sinCambio = redondeado === 0;
  const positivo = invert ? value < 0 : value > 0;

  const Icono = sinCambio ? Minus : positivo ? ArrowUpRight : ArrowDownRight;

  return (
    <p
      className={cn(
        "mt-2 flex items-center gap-1 font-mono text-[11px]",
        sinCambio
          ? "text-ex-text-muted"
          : positivo
            ? "text-ex-success"
            : "text-ex-danger"
      )}
    >
      <Icono className="size-3" aria-hidden />
      {sinCambio ? "igual que" : `${Math.abs(redondeado)}% vs`} el período anterior
    </p>
  );
}
