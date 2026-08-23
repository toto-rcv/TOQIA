import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { bracelets, db, locations, waiters } from "@/db";
import {
  buildPaged,
  offsetOf,
  type PageParams,
  type Paged,
} from "@/lib/pagination";

export type WaiterListItem = {
  id: number;
  locationId: number;
  locationName: string;
  name: string;
  active: boolean;
  braceletCount: number;
  createdAt: Date;
};

/**
 * Una página de camareros.
 *
 * Mismo criterio que las pulseras: el LIMIT baja hasta el SQL y el COUNT va
 * por separado, sin la subconsulta de pulseras por camarero.
 */
export async function listWaiters(
  options: { accountId?: number; locationId?: number },
  pagination: PageParams
): Promise<Paged<WaiterListItem>> {
  const condiciones: SQL[] = [];
  if (options.accountId) condiciones.push(eq(locations.accountId, options.accountId));
  if (options.locationId) condiciones.push(eq(waiters.locationId, options.locationId));
  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [filas, totales] = await Promise.all([
    db
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
      .where(where)
      // El id desempata: dos camareros homónimos en el mismo local no pueden
      // quedar en un orden distinto entre una página y la siguiente.
      .orderBy(asc(locations.name), asc(waiters.name), asc(waiters.id))
      .limit(pagination.limit)
      .offset(offsetOf(pagination)),

    db
      .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(waiters)
      .innerJoin(locations, eq(waiters.locationId, locations.id))
      .where(where),
  ]);

  return buildPaged(filas, totales[0]?.total ?? 0, pagination);
}

/**
 * Camareros de los locales indicados, para poblar selectores.
 *
 * Cuatro columnas y nada de agregados: es lo que necesita un `<option>`. No
 * está paginado a propósito — un desplegable tiene que traer todas sus
 * opciones o no se puede elegir — pero lleva un tope: con más de mil nombres
 * el control ya no es usable y conviene que falte alguno antes que colgar la
 * página.
 */
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
    .orderBy(asc(waiters.name))
    .limit(1000);
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
