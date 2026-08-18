import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

import { bracelets, db, restaurants, scans } from "@/db";

export type ScanFilters = {
  restaurantId?: number;
  braceletId?: number;
  /** Inclusive, en UTC. */
  from?: Date;
  /** Inclusive, en UTC. */
  to?: Date;
};

export type ScanRow = {
  id: number;
  scannedAt: Date;
  braceletCode: string;
  braceletLabel: string | null;
  restaurantName: string;
  userAgent: string | null;
  ipHash: string | null;
};

function buildWhere(filters: ScanFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.restaurantId) {
    conditions.push(eq(scans.restaurantId, filters.restaurantId));
  }
  if (filters.braceletId) {
    conditions.push(eq(scans.braceletId, filters.braceletId));
  }
  if (filters.from) {
    conditions.push(gte(scans.scannedAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(scans.scannedAt, filters.to));
  }

  if (conditions.length === 0) return undefined;
  return and(...conditions);
}

export async function listScans(
  filters: ScanFilters,
  pagination: { page: number; pageSize: number }
): Promise<{ rows: ScanRow[]; total: number }> {
  const where = buildWhere(filters);
  const offset = (pagination.page - 1) * pagination.pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: scans.id,
        scannedAt: scans.scannedAt,
        braceletCode: bracelets.code,
        braceletLabel: bracelets.label,
        restaurantName: restaurants.name,
        userAgent: scans.userAgent,
        ipHash: scans.ipHash,
      })
      .from(scans)
      .innerJoin(bracelets, eq(scans.braceletId, bracelets.id))
      .innerJoin(restaurants, eq(scans.restaurantId, restaurants.id))
      .where(where)
      .orderBy(desc(scans.scannedAt), desc(scans.id))
      .limit(pagination.pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(scans)
      .where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

/**
 * Misma consulta que listScans pero sin paginar, para el export CSV.
 * Tiene un tope duro para que nadie se lleve puesto el servidor pidiendo
 * un CSV de millones de filas.
 */
export async function listScansForExport(
  filters: ScanFilters,
  limit = 50_000
): Promise<ScanRow[]> {
  return db
    .select({
      id: scans.id,
      scannedAt: scans.scannedAt,
      braceletCode: bracelets.code,
      braceletLabel: bracelets.label,
      restaurantName: restaurants.name,
      userAgent: scans.userAgent,
      ipHash: scans.ipHash,
    })
    .from(scans)
    .innerJoin(bracelets, eq(scans.braceletId, bracelets.id))
    .innerJoin(restaurants, eq(scans.restaurantId, restaurants.id))
    .where(buildWhere(filters))
    .orderBy(desc(scans.scannedAt), desc(scans.id))
    .limit(limit);
}
