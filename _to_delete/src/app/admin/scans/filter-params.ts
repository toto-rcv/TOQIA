import type { ScanFilters } from "@/db/queries/scans";

export type RawScanParams = {
  restaurant?: string;
  bracelet?: string;
  from?: string;
  to?: string;
  page?: string;
};

/**
 * Traduce la query string a filtros de base.
 *
 * Las fechas llegan como "YYYY-MM-DD" desde un <input type="date">, que es un
 * día del calendario local. Las convertimos al instante UTC correspondiente:
 * `from` al comienzo del día y `to` al final, para que el rango sea inclusivo
 * en los dos extremos y no se pierdan los escaneos de la tarde del último día.
 *
 * Nota: la conversión usa la zona horaria del servidor, que es donde corre
 * este código. En un VPS en UTC coincide con lo que se guarda.
 */
export function parseScanFilters(params: RawScanParams): ScanFilters {
  const filters: ScanFilters = {};

  const restaurantId = parsePositiveInt(params.restaurant);
  if (restaurantId) filters.restaurantId = restaurantId;

  const braceletId = parsePositiveInt(params.bracelet);
  if (braceletId) filters.braceletId = braceletId;

  const from = parseDay(params.from, "start");
  if (from) filters.from = from;

  const to = parseDay(params.to, "end");
  if (to) filters.to = to;

  return filters;
}

export function parsePage(value: string | undefined): number {
  const parsed = parsePositiveInt(value);
  return parsed && parsed > 0 ? parsed : 1;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseDay(value: string | undefined, edge: "start" | "end"): Date | undefined {
  if (!value) return undefined;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const [, year, month, day] = match;
  const date =
    edge === "start"
      ? new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
      : new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
