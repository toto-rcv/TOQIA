import { and, desc, eq, sql } from "drizzle-orm";

import { bracelets, db, restaurants, scans } from "@/db";
import type { CachedBracelet } from "@/lib/redirect-cache";

/**
 * Resuelve un código de pulsera a su destino y estado.
 * Es la única consulta que corre en el camino crítico del escaneo, así que
 * pide exactamente las cinco columnas que hacen falta y nada más.
 */
export async function lookupBraceletByCode(
  code: string
): Promise<CachedBracelet | null> {
  const rows = await db
    .select({
      braceletId: bracelets.id,
      restaurantId: bracelets.restaurantId,
      destinationUrl: bracelets.destinationUrl,
      braceletActive: bracelets.active,
      restaurantActive: restaurants.active,
    })
    .from(bracelets)
    .innerJoin(restaurants, eq(bracelets.restaurantId, restaurants.id))
    .where(eq(bracelets.code, code))
    .limit(1);

  return rows[0] ?? null;
}

export type BraceletListItem = {
  id: number;
  code: string;
  label: string | null;
  destinationUrl: string;
  active: boolean;
  restaurantId: number;
  restaurantName: string;
  restaurantActive: boolean;
  scanCount: number;
  lastScanAt: Date | null;
  createdAt: Date;
};

/**
 * Listado de pulseras con conteo de escaneos y último escaneo.
 *
 * Los agregados van por subconsulta en vez de LEFT JOIN + GROUP BY porque el
 * GROUP BY obligaría a agrupar por todas las columnas de bracelets y MySQL
 * terminaría materializando una temporal más grande de lo necesario.
 */
export async function listBracelets(options: {
  restaurantId?: number;
}): Promise<BraceletListItem[]> {
  const scanCount = sql<number>`(
    SELECT COUNT(*) FROM ${scans} WHERE ${scans.braceletId} = ${bracelets.id}
  )`.mapWith(Number);

  const lastScanAt = sql<Date | null>`(
    SELECT MAX(${scans.scannedAt}) FROM ${scans} WHERE ${scans.braceletId} = ${bracelets.id}
  )`;

  const query = db
    .select({
      id: bracelets.id,
      code: bracelets.code,
      label: bracelets.label,
      destinationUrl: bracelets.destinationUrl,
      active: bracelets.active,
      restaurantId: bracelets.restaurantId,
      restaurantName: restaurants.name,
      restaurantActive: restaurants.active,
      createdAt: bracelets.createdAt,
      scanCount,
      lastScanAt,
    })
    .from(bracelets)
    .innerJoin(restaurants, eq(bracelets.restaurantId, restaurants.id))
    .orderBy(restaurants.name, bracelets.code);

  const rows = options.restaurantId
    ? await query.where(eq(bracelets.restaurantId, options.restaurantId))
    : await query;

  return rows.map((row) => ({
    ...row,
    lastScanAt: row.lastScanAt ? new Date(row.lastScanAt) : null,
  }));
}

export async function getBraceletById(id: number) {
  const rows = await db.select().from(bracelets).where(eq(bracelets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getBraceletByCode(code: string) {
  const rows = await db
    .select()
    .from(bracelets)
    .where(eq(bracelets.code, code))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Devuelve los códigos ya usados que coincidan con un prefijo.
 * Lo usa el alta masiva para saltear los que ya existen en vez de reventar
 * con un error de clave duplicada a mitad del lote.
 */
export async function findExistingCodes(codes: string[]): Promise<Set<string>> {
  if (codes.length === 0) return new Set();

  const rows = await db
    .select({ code: bracelets.code })
    .from(bracelets)
    .where(sql`${bracelets.code} IN ${codes}`);

  return new Set(rows.map((row) => row.code));
}

/** Ranking de pulseras más escaneadas, para el dashboard. */
export async function topBracelets(limit = 8) {
  const rows = await db
    .select({
      braceletId: scans.braceletId,
      code: bracelets.code,
      label: bracelets.label,
      restaurantName: restaurants.name,
      total: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(scans)
    .innerJoin(bracelets, eq(scans.braceletId, bracelets.id))
    .innerJoin(restaurants, eq(bracelets.restaurantId, restaurants.id))
    .groupBy(scans.braceletId, bracelets.code, bracelets.label, restaurants.name)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);

  return rows;
}

/** Pulseras activas de un restaurante activo: lo que se usa para validar altas. */
export async function countActiveBracelets(restaurantId: number): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(bracelets)
    .where(and(eq(bracelets.restaurantId, restaurantId), eq(bracelets.active, true)));

  return rows[0]?.total ?? 0;
}
