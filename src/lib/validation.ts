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

/**
 * URL opcional: vacío es válido, pero si hay algo tiene que ser http o https.
 * El mensaje incluye el nombre del campo para que el usuario sepa cuál de los
 * seis enlaces del formulario está mal.
 */
export function validateOptionalUrl(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > 2048) {
    return `${label} no puede superar los 2048 caracteres.`;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return `${label} tiene que ser una URL completa, incluyendo https://`;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return `${label} solo puede ser http o https.`;
  }

  return null;
}

/**
 * Teléfono de WhatsApp. Se acepta cualquier formato de escritura y se valida
 * solo la cantidad de dígitos: un número internacional tiene entre 8 y 15.
 */
export function validatePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return "El teléfono tiene que tener entre 8 y 15 dígitos, con código de país (ej. 5491133334444).";
  }
  return null;
}

/** Valida el estado de suscripción contra la lista permitida. */
export function validateSubscriptionStatus(value: string): string | null {
  const permitidos = ["trial", "active", "past_due", "cancelled"];
  if (!permitidos.includes(value)) return "El estado de suscripción no es válido.";
  return null;
}

/** Email con una validación deliberadamente laxa: la real la hace el login. */
export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return "El email no puede estar vacío.";
  if (trimmed.length > 255) return "El email no puede superar los 255 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "El email no tiene un formato válido.";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return "La contraseña tiene que tener al menos 8 caracteres.";
  if (value.length > 128) return "La contraseña no puede superar los 128 caracteres.";
  return null;
}
