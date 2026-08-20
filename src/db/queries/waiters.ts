import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { bracelets, db, locations, waiters } from "@/db";

export type WaiterListItem = {
  id: number;
  locationId: number;
  locationName: string;
  name: string;
  active: boolean;
  braceletCount: number;
  createdAt: Date;
};

export async function listWaiters(options: {
  accountId?: number;
  locationId?: number;
}): Promise<WaiterListItem[]> {
  const condiciones = [];
  if (options.accountId) condiciones.push(eq(locations.accountId, options.accountId));
  if (options.locationId) condiciones.push(eq(waiters.locationId, options.locationId));

  const query = db
    .select({
      id: waiters.id,
      locationId: waiters.locationId,
      locationName: locations.name,
      name: waiters.name,
      active: waiters.active,
      createdAt: waiters.createdAt,
      braceletCount: sql<number>`(
        SELECT COUNT(*) FROM ${bracelets}
        WHERE ${bracelets.waiterId} = ${waiters.id}
      )`.mapWith(Number),
    })
    .from(waiters)
    .innerJoin(locations, eq(waiters.locationId, locations.id))
    .orderBy(asc(locations.name), asc(waiters.name));

  return condiciones.length > 0 ? query.where(and(...condiciones)) : query;
}

/** Camareros de los locales indicados, para poblar selectores. */
export async function listWaiterOptions(locationIds: number[]) {
  if (locationIds.length === 0) return [];

  return db
    .select({
      id: waiters.id,
      name: waiters.name,
      locationId: waiters.locationId,
      active: waiters.active,
    })
    .from(waiters)
    .where(inArray(waiters.locationId, locationIds))
    .orderBy(asc(waiters.name));
}

/**
 * Trae un camarero verificando que pertenezca a la cuenta.
 * Misma lógica que `getLocationForAccount`: nunca confiar en un id que vino
 * de un formulario.
 */
export async function getWaiterForAccount(id: number, accountId: number) {
  const filas = await db
    .select({
      id: waiters.id,
      locationId: waiters.locationId,
      name: waiters.name,
      active: waiters.active,
    })
    .from(waiters)
    .innerJoin(locations, eq(waiters.locationId, locations.id))
    .where(and(eq(waiters.id, id), eq(locations.accountId, accountId)))
    .limit(1);
  return filas[0] ?? null;
}
