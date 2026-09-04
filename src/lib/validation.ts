/**
 * Validaciones de entrada del panel.
 *
 * **Devuelven una clave de traducción, no un texto.** Antes devolvían la
 * frase ya escrita en castellano, que era cómodo hasta que el panel pasó a
 * los siete idiomas: un mensaje armado acá viaja hasta el diálogo sin pasar
 * por ninguna traducción, y el usuario que puso la web en alemán veía el
 * formulario en alemán y el error en castellano.
 *
 * Ahora devuelven `{ clave, valores }` y el mensaje lo arma quien lo va a
 * mostrar, con el idioma del pedido. Las claves viven en el espacio
 * `Errores` de `messages/*.json`.
 *
 * Este archivo no importa nada de next-intl a propósito: `slugify` lo usan
 * también dos diálogos del admin, que son componentes cliente.
 */

export type ErrorDeValidacion = {
  /** Clave dentro del espacio `Errores`. */
  clave: string;
  /** Valores para interpolar, si la frase los lleva. */
  valores?: Record<string, string | number>;
};

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

export function validateCode(value: string): ErrorDeValidacion | null {
  const trimmed = value.trim();
  if (trimmed === "") return { clave: "codigoVacio" };
  if (trimmed.length > 50) return { clave: "codigoLargo" };
  if (!CODE_PATTERN.test(trimmed)) return { clave: "codigoFormato" };
  return null;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(value: string): ErrorDeValidacion | null {
  const trimmed = value.trim();
  if (trimmed === "") return { clave: "slugVacio" };
  if (trimmed.length > 100) return { clave: "slugLargo" };
  if (!SLUG_PATTERN.test(trimmed)) return { clave: "slugFormato" };
  return null;
}

/**
 * El destino tiene que ser http o https.
 * Cualquier otro protocolo convertiría la pulsera en un vector de ataque
 * contra los clientes del restaurante, así que se rechaza acá y también en
 * el endpoint /r/[code].
 */
export function validateDestinationUrl(value: string): ErrorDeValidacion | null {
  const trimmed = value.trim();
  if (trimmed === "") return { clave: "destinoVacio" };
  if (trimmed.length > 2048) return { clave: "destinoLargo" };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { clave: "destinoIncompleto" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { clave: "destinoProtocolo" };
  }

  return null;
}

/**
 * @param campo clave dentro del espacio `Campos`, para nombrar qué está mal.
 */
export function validateName(
  value: string,
  campo = "nombre"
): ErrorDeValidacion | null {
  const trimmed = value.trim();
  if (trimmed === "") return { clave: "campoVacio", valores: { campo } };
  if (trimmed.length > 255) {
    return { clave: "campoLargo", valores: { campo, tope: 255 } };
  }
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
 *
 * @param campo clave dentro del espacio `Campos`.
 */
export function validateOptionalUrl(
  value: string,
  campo: string
): ErrorDeValidacion | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > 2048) {
    return { clave: "campoLargo", valores: { campo, tope: 2048 } };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { clave: "campoUrlIncompleta", valores: { campo } };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { clave: "campoUrlProtocolo", valores: { campo } };
  }

  return null;
}

/**
 * Teléfono de WhatsApp. Se acepta cualquier formato de escritura y se valida
 * solo la cantidad de dígitos: un número internacional tiene entre 8 y 15.
 */
export function validatePhone(value: string): ErrorDeValidacion | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return { clave: "telefonoDigitos" };
  }
  return null;
}

/** Valida el estado de suscripción contra la lista permitida. */
export function validateSubscriptionStatus(
  value: string
): ErrorDeValidacion | null {
  const permitidos = ["trial", "active", "past_due", "cancelled"];
  if (!permitidos.includes(value)) return { clave: "estadoSuscripcion" };
  return null;
}

/** Email con una validación deliberadamente laxa: la real la hace el login. */
export function validateEmail(value: string): ErrorDeValidacion | null {
  const trimmed = value.trim();
  if (trimmed === "") return { clave: "emailVacio" };
  if (trimmed.length > 255) return { clave: "emailLargo" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { clave: "emailFormato" };
  }
  return null;
}

export function validatePassword(value: string): ErrorDeValidacion | null {
  if (value.length < 8) return { clave: "passwordCorta" };
  if (value.length > 128) return { clave: "passwordLarga" };
  return null;
}
