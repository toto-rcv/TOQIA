import { and, eq, sql, type SQL } from "drizzle-orm";

import { accounts, bracelets, db, locations, scans, waiters } from "@/db";

export type BraceletListItem = {
  id: number;
  code: string;
  label: string | null;
  overrideUrl: string | null;
  active: boolean;
  locationId: number;
  locationName: string;
  locationActive: boolean;
  accountId: number;
  accountName: string;
  accountActive: boolean;
  waiterId: number | null;
  waiterName: string | null;
  scanCount: number;
  reviewClicks: number;
  lastScanAt: Date | null;
  createdAt: Date;
};

/**
 * Listado de pulseras con sus agregados.
 *
 * Los conteos van por subconsulta y no por LEFT JOIN + GROUP BY: agrupar
 * obligaría a incluir todas las columnas de bracelets en el GROUP BY y MySQL
 * terminaría materializando una temporal más grande de lo necesario.
 */
export async function listBracelets(options: {
  accountId?: number;
  locationId?: number;
  waiterId?: number;
}): Promise<BraceletListItem[]> {
  const condiciones: SQL[] = [];
  if (options.accountId) condiciones.push(eq(locations.accountId, options.accountId));
  if (options.locationId) condiciones.push(eq(bracelets.locationId, options.locationId));
  if (options.waiterId) condiciones.push(eq(bracelets.waiterId, options.waiterId));

  const query = db
    .select({
      id: bracelets.id,
      code: bracelets.code,
      label: bracelets.label,
      overrideUrl: bracelets.overrideUrl,
      active: bracelets.active,
      locationId: bracelets.locationId,
      locationName: locations.name,
      locationActive: locations.active,
      accountId: locations.accountId,
      accountName: accounts.name,
      accountActive: accounts.active,
      waiterId: bracelets.waiterId,
      waiterName: waiters.name,
      createdAt: bracelets.createdAt,
      scanCount: sql<number>`(
        SELECT COUNT(*) FROM ${scans} WHERE ${scans.braceletId} = ${bracelets.id}
      )`.mapWith(Number),
      reviewClicks: sql<number>`(
        SELECT COUNT(${scans.reviewClickedAt}) FROM ${scans}
        WHERE ${scans.braceletId} = ${bracelets.id}
      )`.mapWith(Number),
      lastScanAt: sql<Date | null>`(
        SELECT MAX(${scans.scannedAt}) FROM ${scans}
        WHERE ${scans.braceletId} = ${bracelets.id}
      )`,
    })
    .from(bracelets)
    .innerJoin(locations, eq(bracelets.locationId, locations.id))
    .innerJoin(accounts, eq(locations.accountId, accounts.id))
    .leftJoin(waiters, eq(bracelets.waiterId, waiters.id))
    .orderBy(accounts.name, locations.name, bracelets.code);

  const filas =
    condiciones.length > 0 ? await query.where(and(...condiciones)) : await query;

  return filas.map((fila) => ({
    ...fila,
    waiterName: fila.waiterName ?? null,
    lastScanAt: fila.lastScanAt ? new Date(fila.lastScanAt) : null,
  }));
}

export async function getBraceletById(id: number) {
  const filas = await db.select().from(bracelets).where(eq(bracelets.id, id)).limit(1);
  return filas[0] ?? null;
}

export async function getBraceletByCode(code: string) {
  const filas = await db
    .select()
    .from(bracelets)
    .where(eq(bracelets.code, code))
    .limit(1);
  return filas[0] ?? null;
}

/**
 * Trae una pulsera verificando que pertenezca a la cuenta indicada.
 * La usan las acciones del panel del restaurante, que no pueden confiar en un
 * id que llegó por formulario.
 */
export async function getBraceletForAccount(id: number, accountId: number) {
  const filas = await db
    .select({
      id: bracelets.id,
      code: bracelets.code,
      locationId: bracelets.locationId,
      waiterId: bracelets.waiterId,
      label: bracelets.label,
      active: bracelets.active,
    })
    .from(bracelets)
    .innerJoin(locations, eq(bracelets.locationId, locations.id))
    .where(and(eq(bracelets.id, id), eq(locations.accountId, accountId)))
    .limit(1);
  return filas[0] ?? null;
}

/**
 * Códigos ya usados dentro de una lista.
 * El alta masiva la usa para saltear los existentes en vez de reventar con un
 * error de clave duplicada a mitad del lote.
 */
export async function findExistingCodes(codes: string[]): Promise<Set<string>> {
  if (codes.length === 0) return new Set();

  const filas = await db
    .select({ code: bracelets.code })
    .from(bracelets)
    .where(sql`${bracelets.code} IN ${codes}`);

  return new Set(filas.map((fila) => fila.code));
}
