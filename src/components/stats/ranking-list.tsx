import { formatNumber } from "@/lib/utils";

export type RankingItem = {
  id: string | number;
  title: string;
  subtitle?: string | null;
  value: number;
  /** Métrica secundaria, ej. conversión a reseña. */
  detail?: string;
};

/**
 * Ranking con barra de proporción.
 *
 * La barra codifica el mismo dato que el número: sirve para comparar de un
 * vistazo sin leer cada cifra. La escala es relativa al primero de la lista.
 */
export function RankingList({
  items,
  emptyMessage = "Sin datos en este período.",
  medals = false,
}: {
  items: RankingItem[];
  emptyMessage?: string;
  /** Numera las tres primeras posiciones. Se usa en el ranking de camareros. */
  medals?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-ex-text-muted">
        {emptyMessage}
      </p>
    );
  }

  const maximo = items[0]?.value ?? 0;

  return (
    <div>
      {items.map((item, index) => (
        <div
          key={item.id}
          className="ex-card-flush flex items-center gap-3 px-4 py-3 sm:px-5"
        >
          {medals ? (
            <span
              aria-hidden
              className={
                "grid size-6 shrink-0 place-items-center rounded-pill text-[11px] font-bold " +
                (index === 0
                  ? "bg-ex-warning/15 text-ex-warning"
                  : index < 3
                    ? "bg-ex-elevated text-ex-text-secondary"
                    : "text-ex-text-disabled")
              }
            >
              {index + 1}
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-[13.5px] font-medium text-ex-text">
                {item.title}
              </span>
              {item.subtitle ? (
                <span className="truncate text-[11px] text-ex-text-muted">
                  {item.subtitle}
                </span>
              ) : null}
            </div>

            <div className="mt-2 h-1.5 w-full rounded-full bg-ex-navy">
              <div
                className="h-full rounded-full bg-ex-blue"
                style={{ width: `${maximo > 0 ? (item.value / maximo) * 100 : 0}%` }}
              />
            </div>

            {item.detail ? (
              <p className="mt-1.5 text-[11px] text-ex-text-muted">{item.detail}</p>
            ) : null}
          </div>

          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ex-text">
            {formatNumber(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
