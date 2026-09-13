/**
 * Catálogo de íconos del sistema.
 *
 * Este archivo tiene solo texto: ids y etiquetas, sin un componente de React.
 * Así lo pueden importar las Server Actions para validar lo que llega del
 * formulario sin arrastrar el árbol de íconos al servidor. El dibujo de cada
 * uno vive en `components/landing/menu-icons.tsx`.
 *
 * Los ids se guardan en la base (`menu_categories.icon`,
 * `locations.menu_button_icon` y el ícono de cada bloque de horarios), así que
 * **no se renombran**: si alguno deja de usarse, se saca de la lista y lo que
 * lo tenía guardado simplemente deja de mostrar ícono.
 *
 * Los cuatro primeros grupos son de gastronomía, que es de donde salió Toqia.
 * Los tres últimos existen porque el producto ya no es solo para restaurantes:
 * una peluquería, una tienda de ropa o un taller también arman su catálogo y
 * sus botones, y con cubiertos y copas de vino no tenían con qué elegir. Van
 * al final y no intercalados: el local que hoy usa esto es gastronómico y no
 * tiene por qué pagar el costo de buscar entre rubros que no son el suyo.
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
  {
    id: "servicios",
    label: "Servicios",
    icons: [
      { id: "peluqueria", label: "Peluquería" },
      { id: "belleza", label: "Belleza" },
      { id: "gimnasio", label: "Gimnasio" },
      { id: "salud", label: "Salud" },
      { id: "mascotas", label: "Mascotas" },
      { id: "taller", label: "Taller" },
      { id: "auto", label: "Auto" },
      { id: "limpieza", label: "Limpieza" },
    ],
  },
  {
    id: "comercio",
    label: "Comercio",
    icons: [
      { id: "tienda", label: "Tienda" },
      { id: "ropa", label: "Ropa" },
      { id: "calzado", label: "Calzado" },
      { id: "joyas", label: "Joyería" },
      { id: "libros", label: "Librería" },
      { id: "flores", label: "Flores" },
      { id: "regalos", label: "Regalos" },
      { id: "tecnologia", label: "Tecnología" },
    ],
  },
  {
    id: "local",
    label: "En el local",
    icons: [
      { id: "horarios", label: "Horarios" },
      { id: "wifi", label: "Wi-Fi" },
      { id: "ubicacion", label: "Ubicación" },
      { id: "estacionamiento", label: "Estacionamiento" },
      { id: "terraza", label: "Terraza" },
      { id: "musica", label: "Música" },
      { id: "evento", label: "Eventos" },
      { id: "entrada", label: "Entradas" },
      { id: "pago", label: "Pagos" },
      { id: "info", label: "Información" },
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
