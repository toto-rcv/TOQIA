import type { ScanFilters } from "@/db/queries/scans";

export type RawScanParams = {
  cuenta?: string;
  local?: string;
  pulsera?: string;
  camarero?: string;
  convertidos?: string;
  desde?: string;
  hasta?: string;
  page?: string;
};

/**
 * Traduce la query string a filtros de base.
 *
 * `accountId` NO sale de acá nunca en el panel del restaurante: lo impone el
 * servidor a partir de la sesión. Este parser solo lee los filtros que el
 * usuario puede elegir dentro de su propio alcance.
 *
 * Las fechas llegan como "YYYY-MM-DD" desde un <input type="date">, que es un
 * día del calendario local. Se convierten al instante UTC correspondiente:
 * `desde` al comienzo del día y `hasta` al final, para que el rango sea
 * inclusivo en los dos extremos y no se pierdan los escaneos de la noche del
 * último día.
 */
export function parseScanFilters(params: RawScanParams): ScanFilters {
  const filters: ScanFilters = {};

  const locationId = parsePositiveInt(params.local);
  if (locationId) filters.locationId = locationId;

  const braceletId = parsePositiveInt(params.pulsera);
  if (braceletId) filters.braceletId = braceletId;

  const waiterId = parsePositiveInt(params.camarero);
  if (waiterId) filters.waiterId = waiterId;

  if (params.convertidos === "1") filters.onlyConverted = true;

  const from = parseDay(params.desde, "start");
  if (from) filters.from = from;

  const to = parseDay(params.hasta, "end");
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

/** Convierte los filtros a CSV. Se usa en los dos exports. */
export function scansToCsv(
  rows: {
    id: number;
    scannedAt: Date;
    reviewClickedAt: Date | null;
    braceletCode: string;
    braceletLabel: string | null;
    locationName: string;
    accountName: string;
    waiterName: string | null;
    userAgent: string | null;
    ipHash: string | null;
  }[],
  options: { includeAccount: boolean }
): string {
  const encabezado = [
    "id",
    "fecha_utc",
    "fecha_local",
    "pulsera",
    "etiqueta",
    ...(options.includeAccount ? ["cuenta"] : []),
    "local",
    "camarero",
    "dejo_resena",
    "fecha_resena_utc",
    "user_agent",
    "ip_hash",
  ];

  const lineas = [encabezado.join(",")];

  for (const fila of rows) {
    lineas.push(
      [
        fila.id,
        fila.scannedAt.toISOString(),
        formatLocal(fila.scannedAt),
        fila.braceletCode,
        fila.braceletLabel ?? "",
        ...(options.includeAccount ? [fila.accountName] : []),
        fila.locationName,
        fila.waiterName ?? "",
        fila.reviewClickedAt ? "si" : "no",
        fila.reviewClickedAt ? fila.reviewClickedAt.toISOString() : "",
        fila.userAgent ?? "",
        fila.ipHash ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  // El BOM hace que Excel abra el archivo como UTF-8 y no rompa los acentos.
  return `﻿${lineas.join("\r\n")}\r\n`;
}

function formatLocal(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/**
 * Escapa una celda de CSV.
 *
 * Además de comillas y saltos de línea, se prefija con comilla simple
 * cualquier valor que arranque con =, +, - o @: sin eso Excel lo interpreta
 * como fórmula, y un user agent malicioso podría ejecutar algo al abrir el
 * archivo (CSV injection).
 */
function csvCell(value: string | number): string {
  let text = String(value ?? "");

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;

  return text;
}
