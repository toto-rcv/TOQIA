/**
 * Saneamiento de URLs de salida.
 *
 * Todo link que la landing le ofrece a un cliente pasa por acá. Solo se
 * aceptan http y https: sin esto, alguien con acceso a un panel podría cargar
 * un `javascript:` y convertir la pulsera en un vector de ataque contra los
 * clientes del restaurante.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Arma el link de WhatsApp a partir del teléfono cargado.
 * Se quedan solo los dígitos: la gente escribe "+54 9 11 3333-4444" y wa.me
 * necesita "5491133334444".
 */
export function whatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  // Un número internacional tiene entre 8 y 15 dígitos.
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
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
