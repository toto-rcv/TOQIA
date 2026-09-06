/**
 * Huso horario con el que se muestran las fechas cuando todavía no se sabe
 * el de quien mira la pantalla (primera carga, cookies bloqueadas, o
 * simplemente falló la detección). Argentina, porque es donde vive el
 * negocio y la mayoría de quienes usan el panel hoy.
 */
export const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

/**
 * Guarda el huso horario detectado en el navegador de quien mira el panel.
 * La pone `guardarUbicacion` (`@/lib/ubicacion`) después de resolver la
 * geolocalización; acá solo se define el nombre y el vencimiento para que
 * los dos lados usen el mismo valor.
 */
export const COOKIE_TIME_ZONE = "toqia_tz";

/** Un año, igual que la cookie de idioma (`i18n/locales.ts`). */
export const COOKIE_TIME_ZONE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Valida que el string sea un huso horario IANA real ("Europe/Madrid",
 * "America/Argentina/Buenos_Aires") antes de guardarlo o de pasárselo a
 * `Intl.DateTimeFormat`: una cookie manipulada a mano con cualquier otra
 * cosa rompería el formateo de fecha en toda la página.
 */
export function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
