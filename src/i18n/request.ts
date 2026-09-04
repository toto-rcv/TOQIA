import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { COOKIE_IDIOMA, esIdioma, resolverIdioma } from "./locales";

/**
 * De dónde sale el idioma de cada pedido.
 *
 * **Hay dos caminos, y no es capricho: las dos mitades del sistema tienen
 * restricciones distintas.**
 *
 *  1. **El sitio comercial** (`/`, `/en`, `/it`) lleva el idioma en la URL. El
 *     segmento `[locale]` llega acá como `requestLocale` y manda. Que sea una
 *     URL propia por idioma es lo único que le permite a Google indexar las
 *     tres versiones; sin eso, traducir la web no sirve para búsquedas.
 *
 *  2. **Las páginas de la pulsera** (`/r/[code]`, la carta, `/pulsera/*`) no
 *     pueden: su dirección está grabada en el chip
 *     (`toqia.surcodes.com/r/B001`) y meter el idioma en la ruta obligaría a
 *     regrabar cada pulsera — justo lo que este sistema existe para evitar.
 *     Ahí `requestLocale` viene vacío y el idioma sale del pedido: la cookie
 *     primero, el `Accept-Language` del navegador después.
 *
 * La cookie es la misma en los dos casos (ver `routing.ts`), así que la
 * elección viaja de una mitad a la otra.
 *
 * Consecuencia del camino 2: leer cookies o headers vuelve dinámica a la
 * página. Las tres que lo usan ya eran `force-dynamic`. El sitio comercial
 * toma el camino 1 y sigue prerenderizándose estático.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const deLaUrl = await requestLocale;
  if (esIdioma(deLaUrl)) {
    return {
      locale: deLaUrl,
      messages: (await import(`../../messages/${deLaUrl}.json`)).default,
    };
  }

  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);

  const locale = resolverIdioma(
    cookieStore.get(COOKIE_IDIOMA)?.value,
    requestHeaders.get("accept-language")
  );

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
