import { defineRouting } from "next-intl/routing";

import { COOKIE_IDIOMA, COOKIE_IDIOMA_MAX_AGE, IDIOMAS, IDIOMA_POR_DEFECTO } from "./locales";

/**
 * El ruteo por idioma del **sitio comercial** (`/`, `/en`, `/it`).
 *
 * Acá sí va el idioma en la URL, al revés que en las páginas de la pulsera.
 * La diferencia no es de gusto: la landing del restaurante tiene su dirección
 * grabada en un chip y no puede cambiar, mientras que el sitio comercial no
 * tiene esa atadura — y sin una URL propia por idioma, Google indexa una sola
 * versión y traducir la web no sirve de nada para búsquedas.
 *
 * **`localePrefix: "always"`: cada idioma lleva su prefijo, el castellano
 * incluido** (`/es`, `/en`, `/it`…), y `/` redirige al que corresponda.
 *
 * Se probó primero con `"as-needed"`, que deja el castellano en la raíz limpia,
 * y tenía un defecto que en la práctica rompe el selector: desde `/en`, el
 * enlace al castellano apunta a `/`, pero `/` no dice qué idioma es — el
 * middleware aplica su detección, encuentra la cookie en `en` y redirige de
 * vuelta a `/en`. **No había forma de volver al castellano.**
 *
 * Con el prefijo siempre presente, la URL es la fuente de verdad: `/es` es
 * castellano y punto, y la detección solo actúa en `/`, que es exactamente el
 * único lugar donde no hay idioma declarado. `toqia.surcodes.com` sigue
 * funcionando como puerta de entrada: redirige al idioma de cada visitante.
 *
 * La cookie es la MISMA que usan la landing y la carta. Que fueran dos
 * cookies distintas —la de next-intl se llama `NEXT_LOCALE` por defecto— haría
 * que alguien pusiera inglés en la carta y al abrir la web comercial siguiera
 * en castellano, sin ninguna razón visible.
 */
export const routing = defineRouting({
  locales: IDIOMAS,
  defaultLocale: IDIOMA_POR_DEFECTO,
  localePrefix: "always",
  localeCookie: {
    name: COOKIE_IDIOMA,
    maxAge: COOKIE_IDIOMA_MAX_AGE,
    sameSite: "lax",
  },
});
