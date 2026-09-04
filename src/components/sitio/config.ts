/**
 * El contacto del sitio público.
 *
 * `whatsapp` va en formato internacional y sin signos: país + número, todo
 * junto. Acá es +34 678 66 34 34 → "34678663434".
 */
export const CONTACTO = {
  whatsapp: "34678663434",
} as const;

/**
 * El destino de todos los botones de acción.
 *
 * Un solo lugar: los botones aparecen en la barra, en el hero, en el menú del
 * celular y en el cierre, y tres de ellos apuntando bien y uno mal es un error
 * que no se nota hasta que un cliente se pierde.
 *
 * El mensaje llega ya traducido: quien lo va a leer es quien escribe, y si
 * llegó a la web en italiano el chat no tiene por qué abrirse en castellano.
 */
export function enlaceDeContacto(mensaje: string): string {
  return `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Los enlaces de la barra y del pie.
 *
 * Viven acá y no en nav-sitio.tsx a propósito: ese archivo es `"use client"`, y
 * un componente de servidor —el pie— que importe un valor de un módulo cliente
 * no recibe el array sino una referencia al componente. El build falla recién
 * al prerenderizar, con un `SECCIONES.map is not a function` que no dice nada.
 *
 * `clave` es la entrada en `Sitio.nav` de los archivos de traducción; `href`
 * es un ancla dentro de la misma página y por eso no lleva prefijo de idioma.
 * Cuando "Planes" tenga su propia ruta habrá que pasarla por el `Link` de
 * next-intl para que el prefijo se mantenga.
 */
export const SECCIONES = [
  { id: "inicio", href: "#inicio", clave: "inicio" },
  { id: "como-funciona", href: "#como-funciona", clave: "comoFunciona" },
  // "Planes" todavía no tiene sección propia: mientras tanto lleva al cierre,
  // que es donde se pide presupuesto.
  { id: "planes", href: "#contacto", clave: "planes" },
  { id: "contacto", href: "#contacto", clave: "contacto" },
] as const;
