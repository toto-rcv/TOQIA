import { and, asc, eq, sql } from "drizzle-orm";

import { accounts, bracelets, db, locations, scans, user } from "@/db";

export type AccountListItem = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  subscriptionStatus: string;
  subscriptionPrice: string | null;
  subscriptionExpiresAt: Date | null;
  distributorId: string | null;
  distributorName: string | null;
  locationCount: number;
  braceletCount: number;
  scanCount: number;
  createdAt: Date;
};

/** Listado para el admin, con los agregados que se muestran en la tabla. */
export async function listAccounts(options?: {
  distributorId?: string;
}): Promise<AccountListItem[]> {
  const query = db
    .select({
      id: accounts.id,
      name: accounts.name,
      slug: accounts.slug,
      active: accounts.active,
      subscriptionStatus: accounts.subscriptionStatus,
      subscriptionPrice: accounts.subscriptionPrice,
      subscriptionExpiresAt: accounts.subscriptionExpiresAt,
      distributorId: accounts.distributorId,
      distributorName: user.name,
      createdAt: accounts.createdAt,
      locationCount: sql<number>`(
        SELECT COUNT(*) FROM ${locations}
        WHERE ${locations.accountId} = ${accounts.id}
      )`.mapWith(Number),
      braceletCount: sql<number>`(
        SELECT COUNT(*) FROM ${bracelets}
        INNER JOIN ${locations} AS l2 ON l2.id = ${bracelets.locationId}
        WHERE l2.account_id = ${accounts.id}
      )`.mapWith(Number),
      scanCount: sql<number>`(
        SELECT COUNT(*) FROM ${scans}
        WHERE ${scans.accountId} = ${accounts.id}
      )`.mapWith(Number),
    })
    .from(accounts)
    .leftJoin(user, eq(accounts.distributorId, user.id))
    .orderBy(asc(accounts.name));

  const filas = options?.distributorId
    ? await query.where(eq(accounts.distributorId, options.distributorId))
    : await query;

  return filas.map((fila) => ({
    ...fila,
    distributorName: fila.distributorName ?? null,
  }));
}

export async function getAccountById(id: number) {
  const filas = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1);
  return filas[0] ?? null;
}

export async function getAccountBySlug(slug: string) {
  const filas = await db
    .select()
    .from(accounts)
    .where(eq(accounts.slug, slug))
    .limit(1);
  return filas[0] ?? null;
}

/** Opciones mínimas para los selectores de los formularios. */
export async function listAccountOptions() {
  return db
    .select({ id: accounts.id, name: accounts.name, active: accounts.active })
    .from(accounts)
    .orderBy(asc(accounts.name));
}

/**
 * Códigos de todas las pulseras de una cuenta.
 * Se usa para invalidar el caché de la landing cuando cambia algo a nivel
 * cuenta (baja, suscripción cancelada) que afecta a todas sus pulseras.
 */
export async function getBraceletCodesOfAccount(
  accountId: number
): Promise<string[]> {
  const filas = await db
    .select({ code: bracelets.code })
    .from(bracelets)
    .innerJoin(locations, eq(bracelets.locationId, locations.id))
    .where(eq(locations.accountId, accountId));
  return filas.map((fila) => fila.code);
}

/** Usuarios con rol de restaurante asociados a una cuenta. */
export async function listAccountUsers(accountId: number) {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.accountId, accountId))
    .orderBy(asc(user.email));
}

/** Distribuidores disponibles para asignar a una cuenta. */
export async function listDistributors() {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.role, "distributor"))
    .orderBy(asc(user.name));
}

/**
 * Solo los ids de las cuentas de un distribuidor.
 *
 * Es la barrera del panel del distribuidor: todo lo que ve se filtra por esta
 * lista, que sale de su sesión y nunca de la URL. Con la lista vacía, las
 * consultas de estadísticas devuelven cero en vez de todo el sistema.
 */
export async function listAccountIdsOfDistributor(
  distributorId: string
): Promise<number[]> {
  const filas = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.distributorId, distributorId));
  return filas.map((fila) => fila.id);
}

/** Un distribuidor por id, para validar el destino de una pulsera. */
export async function getDistributorById(id: string) {
  const filas = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(eq(user.id, id), eq(user.role, "distributor")))
    .limit(1);
  return filas[0] ?? null;
}
