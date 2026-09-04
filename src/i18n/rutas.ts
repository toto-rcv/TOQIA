import { getPathname } from "./navegacion";
import { IDIOMA_POR_DEFECTO, esIdioma, type Idioma } from "./locales";

/**
 * La URL del inicio del sitio comercial en un idioma dado: `/`, `/en`, `/it`.
 *
 * Existe para que ningún componente arme el prefijo a mano. Con
 * `localePrefix: "as-needed"` el castellano no lleva prefijo y los otros dos
 * sí, y esa asimetría escrita a mano en cinco lugares distintos es una de esas
 * cosas que funcionan hasta que alguien agrega un cuarto idioma.
 */
export function inicioDelSitio(locale: string): string {
  const idioma: Idioma = esIdioma(locale) ? locale : IDIOMA_POR_DEFECTO;
  return getPathname({ href: "/", locale: idioma });
}
