import { and, desc, eq, gte, inArray, isNotNull, lt, sql, type SQL } from "drizzle-orm";

import { bracelets, db, locations, scans, waiters } from "@/db";
import {
  addDays,
  localDateKey,
  sqlLocalDate,
  variation,
  type Period,
} from "@/lib/time";

/**
 * Consultas de estadísticas.
 *
 * Todas reciben un `scope`. El admin pasa `{}` y ve el sistema entero; el
 * panel del restaurante pasa el `accountId` que sale **de la sesión**, nunca
 * de la query string. Esa es la barrera que impide que un restaurante vea
 * datos de otro cambiando un número en la URL.
 */
export type StatsScope = {
  /** Ausente = sin filtrar por cuenta. Solo lo usa el admin. */
  accountId?: number;
  /**
   * Varias cuentas a la vez. Lo usa el distribuidor, que ve juntas todas las
   * que tiene asignadas. Una lista vacía significa "ninguna cuenta", no
   * "todas": si no, un distribuidor sin cuentas vería el sistema entero.
   */
  accountIds?: number[];
  /** Si viene, limita a un local. Si no, agrega todos los del alcance. */
  locationId?: number;
};

function scopeCondition(scope: StatsScope): SQL | undefined {
  const condiciones: SQL[] = [];
  if (scope.accountId) condiciones.push(eq(scans.accountId, scope.accountId));
  if (scope.accountIds) {
    condiciones.push(
      scope.accountIds.length === 0
        ? sql`1 = 0`
        : inArray(scans.accountId, scope.accountIds)
    );
  }
  if (scope.locationId) condiciones.push(eq(scans.locationId, scope.locationId));
  if (condiciones.length === 0) return undefined;
  return and(...condiciones);
}

function periodCondition(from: Date, to: Date): SQL {
  return and(gte(scans.scannedAt, from), lt(scans.scannedAt, to))!;
}

/* ── Resumen ─────────────────────────────────────────────────────────────── */

export type StatsSummary = {
  scans: number;
  reviewClicks: number;
  /** Porcentaje de escaneos que terminaron en la reseña. */
  conversionRate: number;
  previous: {
    scans: number;
    reviewClicks: number;
    conversionRate: number;
  };
  variation: {
    scans: number | null;
    reviewClicks: number | null;
  };
};

async function countPeriod(
  scope: StatsScope,
  from: Date,
  to: Date
): Promise<{ scans: number; reviewClicks: number }> {
  const filas = await db
    .select({
      total: sql<number>`COUNT(*)`.mapWith(Number),
      // COUNT de una columna ignora los NULL: cuenta solo los que hicieron clic.
      clicks: sql<number>`COUNT(${scans.reviewClickedAt})`.mapWith(Number),
    })
    .from(scans)
    .where(and(scopeCondition(scope), periodCondition(from, to)));

  return {
    scans: filas[0]?.total ?? 0,
    reviewClicks: filas[0]?.clicks ?? 0,
  };
}

export async function getStatsSummary(
  scope: StatsScope,
  period: Period
): Promise<StatsSummary> {
  const [actual, previo] = await Promise.all([
    countPeriod(scope, period.from, period.to),
    countPeriod(scope, period.prevFrom, period.prevTo),
  ]);

  const tasa = (clicks: number, total: number) =>
    total === 0 ? 0 : (clicks / total) * 100;

  return {
    scans: actual.scans,
    reviewClicks: actual.reviewClicks,
    conversionRate: tasa(actual.reviewClicks, actual.scans),
    previous: {
      scans: previo.scans,
      reviewClicks: previo.reviewClicks,
      conversionRate: tasa(previo.reviewClicks, previo.scans),
    },
    variation: {
      scans: variation(actual.scans, previo.scans),
      reviewClicks: variation(actual.reviewClicks, previo.reviewClicks),
    },
  };
}

/** Total histórico, sin período. Es el número grande de "escaneos totales". */
export async function getTotalScans(scope: StatsScope): Promise<number> {
  const filas = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(scans)
    .where(scopeCondition(scope));
  return filas[0]?.total ?? 0;
}

/* ── Serie temporal ──────────────────────────────────────────────────────── */

export type Granularity = "day" | "week" | "month";

export type SeriesPoint = {
  /** Clave ordenable: "2026-08-18", "2026-W33" o "2026-08". */
  key: string;
  /** Etiqueta lista para el eje. */
  label: string;
  scans: number;
  reviewClicks: number;
};

/**
 * Evolución de escaneos y clics.
 *
 * El agrupado por día rellena los días sin escaneos con cero: MySQL solo
 * devuelve los que tienen filas, y un gráfico con días faltantes miente sobre
 * la tendencia. Semana y mes no se rellenan porque los huecos ahí son raros y
 * la lógica de calendario no compensa.
 */
export async function getSeries(
  scope: StatsScope,
  period: Period,
  granularity: Granularity
): Promise<SeriesPoint[]> {
  const fechaLocal = sqlLocalDate("scans.scanned_at");

  const expresion =
    granularity === "day"
      ? sql.raw(fechaLocal)
      : granularity === "week"
        ? // Modo 3 = semanas ISO, arrancando el lunes.
          sql.raw(`DATE_FORMAT(${fechaLocal}, '%x-W%v')`)
        : sql.raw(`DATE_FORMAT(${fechaLocal}, '%Y-%m')`);

  const filas = await db
    .select({
      bucket: sql<string>`${expresion}`,
      total: sql<number>`COUNT(*)`.mapWith(Number),
      clicks: sql<number>`COUNT(${scans.reviewClickedAt})`.mapWith(Number),
    })
    .from(scans)
    .where(and(scopeCondition(scope), periodCondition(period.from, period.to)))
    .groupBy(expresion)
    .orderBy(expresion);

  const porBucket = new Map<string, { scans: number; clicks: number }>();
  for (const fila of filas) {
    const raw: unknown = fila.bucket;
    const key =
      raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw);
    porBucket.set(key, { scans: fila.total, clicks: fila.clicks });
  }

  if (granularity !== "day") {
    return [...porBucket.entries()].map(([key, valor]) => ({
      key,
      label: formatBucketLabel(key, granularity),
      scans: valor.scans,
      reviewClicks: valor.clicks,
    }));
  }

  // Relleno de días vacíos.
  const puntos: SeriesPoint[] = [];
  for (let cursor = period.from; cursor < period.to; cursor = addDays(cursor, 1)) {
    const key = localDateKey(cursor);
    const valor = porBucket.get(key);
    puntos.push({
      key,
      label: formatBucketLabel(key, "day"),
      scans: valor?.scans ?? 0,
      reviewClicks: valor?.clicks ?? 0,
    });
  }
  return puntos;
}

function formatBucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "day") {
    const [, mes, dia] = key.split("-");
    return `${dia}/${mes}`;
  }
  if (granularity === "week") {
    const [anio, semana] = key.split("-W");
    return `Sem ${semana} ’${anio.slice(2)}`;
  }
  const [anio, mes] = key.split("-");
  const nombres = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${nombres[Number(mes) - 1] ?? mes} ’${anio.slice(2)}`;
}

/* ── Rankings ────────────────────────────────────────────────────────────── */

export type BraceletRankRow = {
  braceletId: number;
  code: string;
  label: string | null;
  locationName: string;
  waiterName: string | null;
  scans: number;
  reviewClicks: number;
};

export async function getBraceletRanking(
  scope: StatsScope,
  period: Period,
  limit = 10
): Promise<BraceletRankRow[]> {
  return db
    .select({
      braceletId: scans.braceletId,
      code: bracelets.code,
      label: bracelets.label,
      locationName: locations.name,
      waiterName: waiters.name,
      scans: sql<number>`COUNT(*)`.mapWith(Number),
      reviewClicks: sql<number>`COUNT(${scans.reviewClickedAt})`.mapWith(Number),
    })
    .from(scans)
    .innerJoin(bracelets, eq(scans.braceletId, bracelets.id))
    .innerJoin(locations, eq(scans.locationId, locations.id))
    .leftJoin(waiters, eq(bracelets.waiterId, waiters.id))
    .where(and(scopeCondition(scope), periodCondition(period.from, period.to)))
    .groupBy(
      scans.braceletId,
      bracelets.code,
      bracelets.label,
      locations.name,
      waiters.name
    )
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

export type WaiterRankRow = {
  waiterId: number;
  name: string;
  locationName: string;
  scans: number;
  reviewClicks: number;
  conversionRate: number;
};

/**
 * Ranking de camareros del período.
 *
 * Solo entran los escaneos que tenían camarero asignado en su momento. Las
 * pulseras de mesa, sin dueño, quedan afuera a propósito: mezclarlas
 * ensuciaría el ranking que el restaurante usa para premiar gente.
 */
export async function getWaiterRanking(
  scope: StatsScope,
  period: Period,
  limit = 20
): Promise<WaiterRankRow[]> {
  const filas = await db
    .select({
      waiterId: waiters.id,
      name: waiters.name,
      locationName: locations.name,
      scans: sql<number>`COUNT(*)`.mapWith(Number),
      reviewClicks: sql<number>`COUNT(${scans.reviewClickedAt})`.mapWith(Number),
    })
    .from(scans)
    .innerJoin(waiters, eq(scans.waiterId, waiters.id))
    .innerJoin(locations, eq(waiters.locationId, locations.id))
    .where(
      and(
        scopeCondition(scope),
        periodCondition(period.from, period.to),
        isNotNull(scans.waiterId)
      )
    )
    .groupBy(waiters.id, waiters.name, locations.name)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);

  return filas.map((fila) => ({
    ...fila,
    conversionRate: fila.scans === 0 ? 0 : (fila.reviewClicks / fila.scans) * 100,
  }));
}

/* ── Comparación entre locales ───────────────────────────────────────────── */

export type LocationRankRow = {
  locationId: number;
  name: string;
  scans: number;
  reviewClicks: number;
  conversionRate: number;
};

/**
 * Rendimiento local por local.
 *
 * Recibe una lista de cuentas y no una sola porque el mismo desglose lo usan
 * el panel del restaurante (una cuenta) y el del distribuidor (todas las
 * suyas). Con la lista vacía devuelve vacío, que es lo correcto para un
 * distribuidor que todavía no tiene ninguna.
 */
export async function getLocationBreakdown(
  accountIds: number[],
  period: Period
): Promise<LocationRankRow[]> {
  if (accountIds.length === 0) return [];

  const filas = await db
    .select({
      locationId: locations.id,
      name: locations.name,
      scans: sql<number>`COUNT(${scans.id})`.mapWith(Number),
      reviewClicks: sql<number>`COUNT(${scans.reviewClickedAt})`.mapWith(Number),
    })
    .from(locations)
    .leftJoin(
      scans,
      and(
        eq(scans.locationId, locations.id),
        gte(scans.scannedAt, period.from),
        lt(scans.scannedAt, period.to)
      )
    )
    .where(inArray(locations.accountId, accountIds))
    .groupBy(locations.id, locations.name)
    .orderBy(desc(sql`COUNT(${scans.id})`));

  return filas.map((fila) => ({
    ...fila,
    conversionRate: fila.scans === 0 ? 0 : (fila.reviewClicks / fila.scans) * 100,
  }));
}
