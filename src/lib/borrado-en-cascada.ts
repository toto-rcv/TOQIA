import { and, eq, inArray } from "drizzle-orm";

import {
  accounts,
  bracelets,
  db,
  locations,
  menuCategories,
  menuItems,
  user,
} from "@/db";
import { invalidateBracelet } from "@/lib/redirect-cache";
import { olvidarTraducciones } from "@/lib/traduccion/contenido";

/**
 * Borrado en cascada de cuentas y locales.
 *
 * MySQL ya borra solo, por la clave foránea, todo lo que cuelga de un local
 * (camareros, pulseras, categorías, platos, archivos, escaneos — ver
 * src/db/schema.ts) y todo lo que cuelga de una cuenta (sus locales, y con
 * ellos lo anterior). Lo que queda afuera de esa cascada es lo que este
 * archivo limpia a mano:
 *
 *   - `content_translations`: tabla polimórfica sin foreign key. Igual que
 *     `deleteCategory`/`deleteItem` en panel/carta/actions.ts, hay que
 *     borrarla con el id de cada entidad antes de que la fila original
 *     desaparezca.
 *   - Los usuarios del panel de una cuenta borrada: `user.accountId` tampoco
 *     tiene foreign key, y dejarlos con una cuenta que ya no existe es un
 *     login que entra pero no ve nada.
 *   - El caché de la landing: las pulseras que se van tienen que dejar de
 *     redirigir apenas se borran, no cuando venza el TTL.
 *
 * Lo usan tanto el admin (sobre cualquier cuenta o local) como el
 * distribuidor (sobre las suyas): cada acción verifica antes que lo que va a
 * borrar es suyo, y después llama a una de estas dos funciones.
 */

async function datosParaLimpiar(locationIds: number[]) {
  if (locationIds.length === 0) {
    return { categoryIds: [] as number[], itemIds: [] as number[], codigos: [] as string[] };
  }

  const [categorias, platos, pulseras] = await Promise.all([
    db
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(inArray(menuCategories.locationId, locationIds)),
    db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(inArray(menuItems.locationId, locationIds)),
    db
      .select({ code: bracelets.code })
      .from(bracelets)
      .where(inArray(bracelets.locationId, locationIds)),
  ]);

  return {
    categoryIds: categorias.map((fila) => fila.id),
    itemIds: platos.map((fila) => fila.id),
    codigos: pulseras.map((fila) => fila.code),
  };
}

async function limpiarTraducciones(
  locationIds: number[],
  categoryIds: number[],
  itemIds: number[]
) {
  await Promise.all([
    ...locationIds.map((id) => olvidarTraducciones("location", id)),
    ...categoryIds.map((id) => olvidarTraducciones("menu_category", id)),
    ...itemIds.map((id) => olvidarTraducciones("menu_item", id)),
  ]);
}

/**
 * Borra un local entero: camareros, pulseras, categorías, platos, archivos y
 * escaneos caen solos por la clave foránea en cascada.
 */
export async function borrarLocalEnCascada(locationId: number): Promise<void> {
  const { categoryIds, itemIds, codigos } = await datosParaLimpiar([locationId]);

  await db.delete(locations).where(eq(locations.id, locationId));

  await limpiarTraducciones([locationId], categoryIds, itemIds);
  for (const code of codigos) invalidateBracelet(code);
}

/**
 * Borra una cuenta entera: todos sus locales (y con ellos, todo lo de
 * arriba) caen por la clave foránea en cascada.
 */
export async function borrarCuentaEnCascada(accountId: number): Promise<void> {
  const localesDeLaCuenta = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.accountId, accountId));
  const locationIds = localesDeLaCuenta.map((fila) => fila.id);

  const { categoryIds, itemIds, codigos } = await datosParaLimpiar(locationIds);

  // Los usuarios del panel de esta cuenta se van con ella: sin cuenta no
  // tienen nada que administrar, y dejarlos apuntando a una cuenta que ya no
  // existe sería un login que entra y no ve nada.
  await db
    .delete(user)
    .where(and(eq(user.accountId, accountId), eq(user.role, "restaurant")));

  await db.delete(accounts).where(eq(accounts.id, accountId));

  await limpiarTraducciones(locationIds, categoryIds, itemIds);
  for (const code of codigos) invalidateBracelet(code);
}
