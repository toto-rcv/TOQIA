import { and, asc, eq, sql } from "drizzle-orm";

import { db, menuCategories, menuItems } from "@/db";

export type MenuItemRow = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string | null;
  imageUrl: string | null;
  position: number;
  available: boolean;
  active: boolean;
};

export type MenuCategoryRow = {
  id: number;
  name: string;
  description: string | null;
  /** Id del ícono elegido en el panel. Ver src/lib/menu-icons.ts. */
  icon: string | null;
  position: number;
  active: boolean;
  items: MenuItemRow[];
};

/**
 * La carta completa de un local, agrupada por categoría.
 *
 * `soloVisibles` es lo que usa la página pública: deja afuera lo desactivado.
 * El panel la pide con todo, porque el restaurante tiene que poder ver y
 * reactivar lo que apagó.
 */
export async function getMenu(
  locationId: number,
  options: { soloVisibles?: boolean } = {}
): Promise<MenuCategoryRow[]> {
  const soloVisibles = options.soloVisibles ?? false;

  const [categorias, platos] = await Promise.all([
    db
      .select()
      .from(menuCategories)
      .where(
        soloVisibles
          ? and(
              eq(menuCategories.locationId, locationId),
              eq(menuCategories.active, true)
            )
          : eq(menuCategories.locationId, locationId)
      )
      .orderBy(asc(menuCategories.position), asc(menuCategories.id)),

    db
      .select()
      .from(menuItems)
      .where(
        soloVisibles
          ? and(eq(menuItems.locationId, locationId), eq(menuItems.active, true))
          : eq(menuItems.locationId, locationId)
      )
      .orderBy(asc(menuItems.position), asc(menuItems.id)),
  ]);

  // Se agrupa en memoria en vez de con un join: son decenas de filas, no
  // miles, y así cada categoría conserva su orden sin pelear con el ORDER BY
  // combinado.
  const porCategoria = new Map<number, MenuItemRow[]>();
  for (const plato of platos) {
    const lista = porCategoria.get(plato.categoryId) ?? [];
    lista.push(plato);
    porCategoria.set(plato.categoryId, lista);
  }

  return categorias.map((categoria) => ({
    id: categoria.id,
    name: categoria.name,
    description: categoria.description,
    icon: categoria.icon,
    position: categoria.position,
    active: categoria.active,
    items: porCategoria.get(categoria.id) ?? [],
  }));
}

/**
 * ¿Este local tiene carta cargada?
 *
 * Lo consulta la landing para decidir si el botón "Ver menú" va a la carta
 * propia o al PDF externo. Cuenta solo platos visibles: una carta con
 * categorías vacías no es una carta.
 */
export async function hasVisibleMenu(locationId: number): Promise<boolean> {
  const filas = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(menuItems)
    .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(
      and(
        eq(menuItems.locationId, locationId),
        eq(menuItems.active, true),
        eq(menuCategories.active, true)
      )
    );

  return (filas[0]?.total ?? 0) > 0;
}

/** Trae una categoría verificando que sea del local indicado. */
export async function getCategoryForLocation(id: number, locationId: number) {
  const filas = await db
    .select()
    .from(menuCategories)
    .where(and(eq(menuCategories.id, id), eq(menuCategories.locationId, locationId)))
    .limit(1);
  return filas[0] ?? null;
}

/** Trae un plato verificando que sea del local indicado. */
export async function getItemForLocation(id: number, locationId: number) {
  const filas = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.locationId, locationId)))
    .limit(1);
  return filas[0] ?? null;
}

/** Siguiente posición libre, para que lo nuevo quede al final de la lista. */
export async function nextCategoryPosition(locationId: number): Promise<number> {
  const filas = await db
    .select({ maximo: sql<number>`COALESCE(MAX(${menuCategories.position}), -1)`.mapWith(Number) })
    .from(menuCategories)
    .where(eq(menuCategories.locationId, locationId));
  return (filas[0]?.maximo ?? -1) + 1;
}

export async function nextItemPosition(categoryId: number): Promise<number> {
  const filas = await db
    .select({ maximo: sql<number>`COALESCE(MAX(${menuItems.position}), -1)`.mapWith(Number) })
    .from(menuItems)
    .where(eq(menuItems.categoryId, categoryId));
  return (filas[0]?.maximo ?? -1) + 1;
}
