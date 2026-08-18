import { asc, eq, sql } from "drizzle-orm";

import { bracelets, db, restaurants, scans } from "@/db";

export type RestaurantListItem = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  braceletCount: number;
  scanCount: number;
};

export async function listRestaurants(): Promise<RestaurantListItem[]> {
  return db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      slug: restaurants.slug,
      active: restaurants.active,
      createdAt: restaurants.createdAt,
      braceletCount: sql<number>`(
        SELECT COUNT(*) FROM ${bracelets}
        WHERE ${bracelets.restaurantId} = ${restaurants.id}
      )`.mapWith(Number),
      scanCount: sql<number>`(
        SELECT COUNT(*) FROM ${scans}
        WHERE ${scans.restaurantId} = ${restaurants.id}
      )`.mapWith(Number),
    })
    .from(restaurants)
    .orderBy(asc(restaurants.name));
}

/** Versión mínima para poblar los <select> de filtros y formularios. */
export async function listRestaurantOptions() {
  return db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      active: restaurants.active,
    })
    .from(restaurants)
    .orderBy(asc(restaurants.name));
}

export async function getRestaurantById(id: number) {
  const rows = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRestaurantBySlug(slug: string) {
  const rows = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/** Códigos de todas las pulseras de un restaurante: se usa para invalidar el
 *  caché de redirección cuando el restaurante se activa o desactiva. */
export async function getBraceletCodesOfRestaurant(
  restaurantId: number
): Promise<string[]> {
  const rows = await db
    .select({ code: bracelets.code })
    .from(bracelets)
    .where(eq(bracelets.restaurantId, restaurantId));
  return rows.map((row) => row.code);
}
