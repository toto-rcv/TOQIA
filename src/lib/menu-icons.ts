/**
 * Catálogo de íconos para las categorías de la carta.
 *
 * Este archivo tiene solo texto: ids y etiquetas, sin un componente de React.
 * Así lo pueden importar las Server Actions para validar lo que llega del
 * formulario sin arrastrar el árbol de íconos al servidor. El dibujo de cada
 * uno vive en `components/landing/menu-icons.tsx`.
 *
 * Los ids se guardan en la base (`menu_categories.icon`), así que **no se
 * renombran**: si alguno deja de usarse, se saca de la lista y las categorías
 * que lo tenían simplemente dejan de mostrar ícono.
 */

export const MENU_ICON_GROUPS = [
  {
    id: "comer",
    label: "Para comer",
    icons: [
      { id: "hamburguesa", label: "Hamburguesa" },
      { id: "pizza", label: "Pizza" },
      { id: "carne", label: "Carne" },
      { id: "pollo", label: "Pollo" },
      { id: "pescado", label: "Pescado" },
      { id: "empanada", label: "Empanadas" },
      { id: "sandwich", label: "Sándwiches" },
      { id: "ensalada", label: "Ensaladas" },
      { id: "sopa", label: "Sopas" },
      { id: "pasta", label: "Pastas" },
      { id: "desayuno", label: "Desayuno" },
      { id: "panaderia", label: "Panadería" },
      { id: "vegetariano", label: "Vegetariano" },
      { id: "parrilla", label: "Parrilla" },
    ],
  },
  {
    id: "postres",
    label: "Postres",
    icons: [
      { id: "postre", label: "Postres" },
      { id: "torta", label: "Tortas" },
      { id: "helado", label: "Helados" },
      { id: "galleta", label: "Galletas" },
    ],
  },
  {
    id: "bebidas",
    label: "Bebidas",
    icons: [
      { id: "bebida", label: "Bebidas" },
      { id: "cafe", label: "Café" },
      { id: "cerveza", label: "Cerveza" },
      { id: "vino", label: "Vinos" },
      { id: "coctel", label: "Cócteles" },
      { id: "agua", label: "Agua" },
    ],
  },
  {
    id: "generales",
    label: "Generales",
    icons: [
      { id: "cubiertos", label: "Cubiertos" },
      { id: "olla", label: "Cocina" },
      { id: "picada", label: "Para compartir" },
    ],
  },
] as const;

export const MENU_ICON_IDS: string[] = MENU_ICON_GROUPS.flatMap((grupo) =>
  grupo.icons.map((icono) => icono.id)
);

/** Devuelve el id si existe en el catálogo; si no, null. */
export function normalizeMenuIcon(value: string | null | undefined): string | null {
  if (!value) return null;
  const limpio = value.trim();
  return MENU_ICON_IDS.includes(limpio) ? limpio : null;
}
