/**
 * Saneamiento de URLs de salida.
 *
 * Todo link que la landing le ofrece a un cliente pasa por acá. Solo se
 * aceptan http, https y las rutas internas de archivos subidos: sin esto,
 * alguien con acceso a un panel podría cargar un `javascript:` y convertir la
 * pulsera en un vector de ataque contra los clientes del restaurante.
 */

/** Archivos que subió el restaurante y sirve `/api/media/[id]/[token]`. */
const RUTA_INTERNA = /^\/api\/media\/\d+\/[A-Za-z0-9._-]+$/;

export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  // Ruta propia: es del mismo origen, no hay protocolo que validar.
  if (RUTA_INTERNA.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** ¿El link sale del sitio? Decide si el `<a>` lleva `target="_blank"`. */
export function esEnlaceExterno(url: string): boolean {
  return !url.startsWith("/");
}

/**
 * Arma el link de WhatsApp a partir del teléfono cargado.
 * Se quedan solo los dígitos: la gente escribe "+54 9 11 3333-4444" y wa.me
 * necesita "5491133334444".
 *
 * `mensaje` viaja en `?text=` y WhatsApp lo deja escrito en el chat, listo
 * para enviar. El cliente igual puede borrarlo o cambiarlo antes de mandarlo.
 */
export function whatsappUrl(
  phone: string | null | undefined,
  mensaje?: string
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  // Un número internacional tiene entre 8 y 15 dígitos.
  if (digits.length < 8 || digits.length > 15) return null;

  const base = `https://wa.me/${digits}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/**
 * Lo que aparece escrito en WhatsApp al tocar "Reservar", cuando quien llama
 * no pasa nada. Es el respaldo: el texto de verdad sale de las traducciones
 * (`Accesos.mensajeReserva`), porque lo lee el cliente del restaurante y puede
 * estar en inglés o italiano.
 */
export const MENSAJE_RESERVA = "Hola, quisiera reservar una mesa";

/**
 * Destino del botón "Reservar".
 *
 * Por defecto abre WhatsApp con el mensaje ya escrito, que es lo que pide un
 * restaurante chico. Si el local cargó una plataforma de reservas propia, esa
 * gana: ya tiene su circuito armado y no queremos desviarle las reservas al
 * teléfono del salón.
 */
export function reservationUrlFor(
  reservationUrl: string | null | undefined,
  whatsappPhone: string | null | undefined,
  mensaje: string = MENSAJE_RESERVA
): string | null {
  return safeUrl(reservationUrl) ?? whatsappUrl(whatsappPhone, mensaje);
}

/**
 * Link a Google Maps. Si el local cargó una URL propia se usa esa; si solo
 * cargó la dirección, se arma una búsqueda.
 */
export function mapsUrlFor(
  mapsUrl: string | null | undefined,
  address: string | null | undefined
): string | null {
  const explicit = safeUrl(mapsUrl);
  if (explicit) return explicit;

  if (!address || address.trim() === "") return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/**
 * Link `tel:` a partir del teléfono cargado.
 * Se conserva el signo + si estaba, porque en un número internacional importa
 * para que el celular marque bien desde el exterior.
 */
export function telUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const limpio = phone.trim();
  const digits = limpio.replace(/[^\d]/g, "");
  if (digits.length < 6 || digits.length > 15) return null;

  return `tel:${limpio.startsWith("+") ? "+" : ""}${digits}`;
}
