import { getLocale } from "next-intl/server";

import { esIdioma, IDIOMA_POR_DEFECTO, type Idioma } from "./locales";

/**
 * El idioma de este pedido, ya tipado.
 *
 * `getLocale()` de next-intl devuelve un `string` cualquiera. Todo lo que
 * consulta traducciones trabaja con `Idioma`, así que la conversión se hace
 * una vez acá en lugar de un `as Idioma` en cada página — que es la clase de
 * cast que un día tapa un locale inventado por una cookie manipulada.
 *
 * Archivo aparte de `locales.ts` porque importa `next-intl/server`, y
 * `locales.ts` lo usan también componentes de cliente.
 */
export async function idiomaActual(): Promise<Idioma> {
  const locale = await getLocale();
  return esIdioma(locale) ? locale : IDIOMA_POR_DEFECTO;
}
