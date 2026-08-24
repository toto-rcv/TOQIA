import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { accounts, bracelets, db, locations, scans } from "@/db";

export type LocationListItem = {
  id: number;
  accountId: number;
  accountName: string;
  name: string;
  slug: string;
  active: boolean;
  logoUrl: string | null;
  googleReviewUrl: string | null;
  braceletCount: number;
  scanCount: number;
  createdAt: Date;
};

export async function listLocations(options?: {
  accountId?: number;
  /** Varias cuentas a la vez: lo usa el distribuidor con las suyas. */
  accountIds?: number[];
}): Promise<LocationListItem[]> {
  const query = db
    .select({
      id: locations.id,
      accountId: locations.accountId,
      accountName: accounts.name,
      name: locations.name,
      slug: locations.slug,
      active: locations.active,
      logoUrl: locations.logoUrl,
      googleReviewUrl: locations.googleReviewUrl,
      createdAt: locations.createdAt,
      braceletCount: sql<number>`(
        SELECT COUNT(*) FROM ${bracelets}
        WHERE ${bracelets.locationId} = ${locations.id}
      )`.mapWith(Number),
      scanCount: sql<number>`(
        SELECT COUNT(*) FROM ${scans}
        WHERE ${scans.locationId} = ${locations.id}
      )`.mapWith(Number),
    })
    .from(locations)
    .innerJoin(accounts, eq(locations.accountId, accounts.id))
    .orderBy(asc(accounts.name), asc(locations.name));

  if (options?.accountId) {
    return query.where(eq(locations.accountId, options.accountId));
  }

  if (options?.accountIds) {
    // Lista vacía significa "ninguna cuenta", no "todas": sin esto, un
    // distribuidor sin cuentas vería los locales de todo el sistema.
    if (options.accountIds.length === 0) return [];
    return query.where(inArray(locations.accountId, options.accountIds));
  }

  return query;
}

/** Selector de locales del panel del restaurante. */
export async function listLocationOptions(accountId: number) {
  return db
    .select({ id: locations.id, name: locations.name, active: locations.active })
    .from(locations)
    .where(eq(locations.accountId, accountId))
    .orderBy(asc(locations.name));
}

export async function getLocationById(id: number) {
  const filas = await db
    .select()
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  return filas[0] ?? null;
}

/**
 * Igual que `getLocationById` pero exigiendo que el local pertenezca a la
 * cuenta indicada.
 *
 * Es la función que usan las acciones del panel del restaurante: sin esto, un
 * usuario podría mandar el id de un local ajeno en el formulario y editarlo.
 */
export async function getLocationForAccount(id: number, accountId: number) {
  const filas = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.accountId, accountId)))
    .limit(1);
  return filas[0] ?? null;
}

export async function getLocationBySlug(slug: string) {
  const filas = await db
    .select()
    .from(locations)
    .where(eq(locations.slug, slug))
    .limit(1);
  return filas[0] ?? null;
}

/** Códigos de las pulseras de un local, para invalidar el caché de la landing. */
export async function getBraceletCodesOfLocation(
  locationId: number
): Promise<string[]> {
  const filas = await db
    .select({ code: bracelets.code })
    .from(bracelets)
    .where(eq(bracelets.locationId, locationId));
  return filas.map((fila) => fila.code);
}
