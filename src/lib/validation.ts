/**
 * Validaciones de entrada del panel.
 *
 * Todas devuelven un mensaje de error en castellano listo para mostrar, o
 * null si el valor es válido. La idea es que las Server Actions puedan
 * devolver `{ ok: false, error }` sin armar el texto ellas mismas.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export function ok<T = undefined>(data?: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Un código de pulsera tiene que poder ir en una URL sin escaparse. */
const CODE_PATTERN = /^[A-Za-z0-9._-]{1,50}$/;

export function validateCode(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return "El código no puede estar vacío.";
  if (trimmed.length > 50) return "El código no puede superar los 50 caracteres.";
  if (!CODE_PATTERN.test(trimmed)) {
    return "El código solo admite letras, números, punto, guion y guion bajo.";
  }
  return null;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return "El slug no puede estar vacío.";
  if (trimmed.length > 100) return "El slug no puede superar los 100 caracteres.";
  if (!SLUG_PATTERN.test(trimmed)) {
    return "El slug solo admite minúsculas, números y guiones (ej. la-parrilla-centro).";
  }
  return null;
}

/**
 * El destino tiene que ser http o https.
 * Cualquier otro protocolo convertiría la pulsera en un vector de ataque
 * contra los clientes del restaurante, así que se rechaza acá y también en
 * el endpoint /r/[code].
 */
export function validateDestinationUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return "El destino no puede estar vacío.";
  if (trimmed.length > 2048) return "El destino no puede superar los 2048 caracteres.";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "El destino tiene que ser una URL completa, incluyendo https://";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "El destino solo puede ser http o https.";
  }

  return null;
}

export function validateName(value: string, field = "El nombre"): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return `${field} no puede estar vacío.`;
  if (trimmed.length > 255) return `${field} no puede superar los 255 caracteres.`;
  return null;
}

/** Convierte un nombre en un slug utilizable. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Lee un entero de un FormData, devolviendo null si no es válido. */
export function readInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
