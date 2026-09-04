import { and, asc, eq, sql } from "drizzle-orm";

import { db, menuCategories, menuItems } from "@/db";
import type { Idioma } from "@/i18n/locales";
import { conTraduccion, traduccionesDe } from "@/lib/traduccion/contenido";

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
 *
 * `idioma` reemplaza los nombres y descripciones por su traducción guardada
 * (ver `src/lib/traduccion/contenido.ts`). Lo pide la carta pública; el panel
 * no, porque ahí el local tiene que ver y editar lo que él escribió, no una
 * traducción. Donde no haya traducción queda el original: una carta a medio
 * traducir se lee, una carta vacía no.
 */
export async function getMenu(
  locationId: number,
  options: { soloVisibles?: boolean; idioma?: Idioma | null } = {}
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

  // Dos consultas más, no una por plato: se piden todas las traducciones del
  // idioma de una sola vez, con los ids que ya tenemos.
  const [deCategorias, dePlatos] = options.idioma
    ? await Promise.all([
        traduccionesDe(
          "menu_category",
          categorias.map((c) => c.id),
          options.idioma
        ),
        traduccionesDe(
          "menu_item",
          platos.map((p) => p.id),
          options.idioma
        ),
      ])
    : [new Map<string, string>(), new Map<string, string>()];

  // Se agrupa en memoria en vez de con un join: son decenas de filas, no
  // miles, y así cada categoría conserva su orden sin pelear con el ORDER BY
  // combinado.
  const porCategoria = new Map<number, MenuItemRow[]>();
  for (const plato of platos) {
    const lista = porCategoria.get(plato.categoryId) ?? [];
    lista.push(conTraduccion("menu_item", plato, dePlatos));
    porCategoria.set(plato.categoryId, lista);
  }

  return categorias.map((categoria) => {
    const traducida = conTraduccion("menu_category", categoria, deCategorias);
    return {
      id: traducida.id,
      name: traducida.name,
      description: traducida.description,
      icon: traducida.icon,
      position: traducida.position,
      active: traducida.active,
      items: porCategoria.get(traducida.id) ?? [],
    };
  });
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
