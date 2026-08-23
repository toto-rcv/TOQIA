import { and, desc, eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm";

import { accounts, bracelets, db, locations, scans, waiters } from "@/db";
import {
  buildPaged,
  offsetOf,
  type PageParams,
  type Paged,
} from "@/lib/pagination";

export type ScanFilters = {
  /** Siempre lo impone el servidor a partir de la sesión, nunca la URL. */
  accountId?: number;
  locationId?: number;
  braceletId?: number;
  waiterId?: number;
  /** Solo los escaneos que terminaron en la reseña. */
  onlyConverted?: boolean;
  /** Inclusive, en UTC. */
  from?: Date;
  /** Inclusive, en UTC. */
  to?: Date;
};

export type ScanRow = {
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
};

function buildWhere(filters: ScanFilters): SQL | undefined {
  const condiciones: SQL[] = [];

  if (filters.accountId) condiciones.push(eq(scans.accountId, filters.accountId));
  if (filters.locationId) condiciones.push(eq(scans.locationId, filters.locationId));
  if (filters.braceletId) condiciones.push(eq(scans.braceletId, filters.braceletId));
  if (filters.waiterId) condiciones.push(eq(scans.waiterId, filters.waiterId));
  if (filters.onlyConverted) condiciones.push(isNotNull(scans.reviewClickedAt));
  if (filters.from) condiciones.push(gte(scans.scannedAt, filters.from));
  if (filters.to) condiciones.push(lte(scans.scannedAt, filters.to));

  if (condiciones.length === 0) return undefined;
  return and(...condiciones);
}

const SELECCION = {
  id: scans.id,
  scannedAt: scans.scannedAt,
  reviewClickedAt: scans.reviewClickedAt,
  braceletCode: bracelets.code,
  braceletLabel: bracelets.label,
  locationName: locations.name,
  accountName: accounts.name,
  waiterName: waiters.name,
  userAgent: scans.userAgent,
  ipHash: scans.ipHash,
};

/**
 * Una página de escaneos.
 *
 * Es la tabla que más crece de todas: un local con veinte pulseras genera
 * miles de filas por mes. El LIMIT es obligatorio, no una optimización.
 */
export async function listScans(
  filters: ScanFilters,
  pagination: PageParams
): Promise<Paged<ScanRow>> {
  const where = buildWhere(filters);

  const [filas, totales] = await Promise.all([
    db
      .select(SELECCION)
      .from(scans)
      .innerJoin(bracelets, eq(scans.braceletId, bracelets.id))
      .innerJoin(locations, eq(scans.locationId, locations.id))
      .innerJoin(accounts, eq(scans.accountId, accounts.id))
      .leftJoin(waiters, eq(scans.waiterId, waiters.id))
      .where(where)
      .orderBy(desc(scans.scannedAt), desc(scans.id))
      .limit(pagination.limit)
      .offset(offsetOf(pagination)),
    db
      .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(scans)
      .where(where),
  ]);

  const data = filas.map((fila) => ({
    ...fila,
    waiterName: fila.waiterName ?? null,
  }));

  return buildPaged(data, totales[0]?.total ?? 0, pagination);
}

/**
 * Misma consulta sin paginar, para el export CSV.
 * Tiene un tope duro para que nadie se lleve puesto el servidor pidiendo un
 * CSV de millones de filas.
 */
export async function listScansForExport(
  filters: ScanFilters,
  limit = 50_000
): Promise<ScanRow[]> {
  const filas = await db
    .select(SELECCION)
    .from(scans)
    .innerJoin(bracelets, eq(scans.braceletId, bracelets.id))
    .innerJoin(locations, eq(scans.locationId, locations.id))
    .innerJoin(accounts, eq(scans.accountId, accounts.id))
    .leftJoin(waiters, eq(scans.waiterId, waiters.id))
    .where(buildWhere(filters))
    .orderBy(desc(scans.scannedAt), desc(scans.id))
    .limit(limit);

  return filas.map((fila) => ({ ...fila, waiterName: fila.waiterName ?? null }));
}
