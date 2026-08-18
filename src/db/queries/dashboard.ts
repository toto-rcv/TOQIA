import { gte, sql } from "drizzle-orm";

import { db, scans } from "@/db";

/**
 * Devuelve el inicio del día de hoy en UTC.
 * Todo lo que se guarda y se compara está en UTC; la conversión a hora local
 * pasa solo al renderizar.
 */
function startOfUtcDay(offsetDays = 0): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - offsetDays,
      0,
      0,
      0,
      0
    )
  );
}

async function countScansSince(since: Date): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(scans)
    .where(gte(scans.scannedAt, since));
  return rows[0]?.total ?? 0;
}

export type DashboardTotals = {
  today: number;
  last7: number;
  last30: number;
  allTime: number;
};

export async function getDashboardTotals(): Promise<DashboardTotals> {
  const [today, last7, last30, allTimeRows] = await Promise.all([
    countScansSince(startOfUtcDay(0)),
    countScansSince(startOfUtcDay(6)), // hoy + 6 días previos = 7 días
    countScansSince(startOfUtcDay(29)),
    db.select({ total: sql<number>`COUNT(*)`.mapWith(Number) }).from(scans),
  ]);

  return { today, last7, last30, allTime: allTimeRows[0]?.total ?? 0 };
}

export type DailyPoint = { date: string; total: number };

/**
 * Escaneos por día de los últimos 30 días.
 *
 * MySQL solo devuelve los días que tienen al menos un escaneo, así que
 * después rellenamos los huecos con cero: un gráfico con días faltantes
 * miente sobre la tendencia.
 */
export async function getScansPerDay(days = 30): Promise<DailyPoint[]> {
  const since = startOfUtcDay(days - 1);

  const rows = await db
    .select({
      day: sql<string>`DATE(${scans.scannedAt})`,
      total: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(scans)
    .where(gte(scans.scannedAt, since))
    .groupBy(sql`DATE(${scans.scannedAt})`)
    .orderBy(sql`DATE(${scans.scannedAt})`);

  const byDay = new Map<string, number>();
  for (const row of rows) {
    // mysql2 puede devolver DATE como string o como Date según la versión y la
    // configuración del driver, así que normalizamos los dos casos.
    const raw: unknown = row.day;
    const key =
      raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).slice(0, 10);
    byDay.set(key, row.total);
  }

  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfUtcDay(i);
    const key = date.toISOString().slice(0, 10);
    points.push({ date: key, total: byDay.get(key) ?? 0 });
  }

  return points;
}
