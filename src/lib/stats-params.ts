import type { Granularity } from "@/db/queries/stats";
import { buildCustomPeriod, buildPeriod, isPeriodKey, type Period } from "./time";

export type StatsSearchParams = {
  periodo?: string;
  g?: string;
  local?: string;
  desde?: string;
  hasta?: string;
  page?: string;
};

export type ParsedStatsParams = {
  period: Period;
  /** El preset elegido, o "custom" si se usó un rango de fechas propio. */
  periodKey: string;
  granularity: Granularity;
  /** Local elegido en el filtro. Hay que validar que pertenezca a la cuenta. */
  locationId?: number;
  desde?: string;
  hasta?: string;
};

/**
 * Traduce la query string a parámetros de consulta.
 *
 * El rango de fechas a medida tiene prioridad sobre el preset: si vienen
 * `desde` y `hasta` válidos, se usan esos. Cualquier valor inválido cae en el
 * default en vez de romper — son parámetros de URL que cualquiera puede editar
 * a mano, y una pantalla de error por escribir mal un querystring no le sirve
 * a nadie.
 */
export function parseStatsParams(params: StatsSearchParams): ParsedStatsParams {
  const granularity: Granularity =
    params.g === "week" || params.g === "month" ? params.g : "day";

  const localRaw = params.local ? Number.parseInt(params.local, 10) : NaN;
  const locationId =
    Number.isFinite(localRaw) && localRaw > 0 ? localRaw : undefined;

  // ── Rango a medida ────────────────────────────────────────────────────────
  if (params.desde && params.hasta) {
    // Si el usuario invirtió las fechas, las damos vuelta en vez de mostrarle
    // un período vacío y dejarlo pensando que no hay datos.
    const [desde, hasta] =
      params.desde <= params.hasta
        ? [params.desde, params.hasta]
        : [params.hasta, params.desde];

    const custom = buildCustomPeriod(desde, hasta);
    if (custom) {
      return {
        period: custom,
        periodKey: "custom",
        granularity,
        locationId,
        desde,
        hasta,
      };
    }
  }

  // ── Preset ────────────────────────────────────────────────────────────────
  const periodKey = isPeriodKey(params.periodo) ? params.periodo : "30d";

  return {
    period: buildPeriod(periodKey),
    periodKey,
    granularity,
    locationId,
  };
}
