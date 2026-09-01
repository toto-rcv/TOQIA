/**
 * El contacto del sitio público.
 *
 * `whatsapp` va en formato internacional y sin signos: país + número, todo
 * junto. Acá es +34 678 66 34 34 → "34678663434".
 */
export const CONTACTO = {
  whatsapp: "34678663434",
  mensaje: "Hola, quiero saber más sobre Toqia para mi negocio.",
} as const;

/**
 * El destino de todos los botones de acción.
 *
 * Un solo lugar: los botones aparecen en la barra, en el hero, en el menú del
 * celular y en el cierre, y tres de ellos apuntando bien y uno mal es un error
 * que no se nota hasta que un cliente se pierde.
 */
export function enlaceDeContacto(): string {
  return `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(CONTACTO.mensaje)}`;
}

/**
 * Los enlaces de la barra y del pie.
 *
 * Viven acá y no en nav-sitio.tsx a propósito: ese archivo es `"use client"`, y
 * un componente de servidor —el pie— que importe un valor de un módulo cliente
 * no recibe el array sino una referencia al componente. El build falla recién
 * al prerenderizar, con un `SECCIONES.map is not a function` que no dice nada.
 *
 * Hoy son anclas dentro de la misma página. Cuando "Planes" tenga su propia
 * ruta, se cambia el `href` acá y la barra, el menú del celular y el pie se
 * actualizan juntos.
 */
export const SECCIONES = [
  { id: "inicio", href: "#inicio", label: "Inicio" },
  { id: "como-funciona", href: "#como-funciona", label: "Cómo funciona" },
  // "Planes" todavía no tiene sección propia: mientras tanto lleva al cierre,
  // que es donde se pide presupuesto.
  { id: "planes", href: "#contacto", label: "Planes" },
  { id: "contacto", href: "#contacto", label: "Contacto" },
] as const;
