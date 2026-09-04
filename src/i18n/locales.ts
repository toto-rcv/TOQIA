import { match } from "@formatjs/intl-localematcher";

/**
 * Los idiomas de las páginas que ve el cliente del restaurante.
 *
 * El panel y el sitio comercial siguen en castellano: acá se traduce lo que
 * lee alguien que apoya el celular en una pulsera, que en un local turístico
 * puede no hablar el idioma del país.
 */
export const IDIOMAS = ["es", "en", "it", "fr", "de", "nl", "ru"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Cómo se llama cada idioma en su propio idioma, que es como se elige. */
export const NOMBRE_DE_IDIOMA: Record<Idioma, string> = {
  es: "Español",
  en: "English",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
  nl: "Nederlands",
  ru: "Русский",
};

/**
 * La cookie donde queda la elección explícita.
 *
 * Existe porque la detección automática acierta la mayoría de las veces pero
 * no siempre: un celular comprado en Alemania que usa un español, un turista
 * que prefiere leer en inglés aunque tenga el teléfono en francés. Sin esta
 * cookie, esa persona cambia el idioma y al abrir la carta vuelve a lo que el
 * navegador dijo — que es peor que no tener selector.
 */
export const COOKIE_IDIOMA = "toqia_idioma";

/** Un año: la elección de idioma no caduca en una sesión. */
export const COOKIE_IDIOMA_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Marca que un render de la landing es la vuelta del selector de idioma y no
 * un escaneo nuevo.
 *
 * `/r/[code]` registra un escaneo al renderizar, y cambiar de idioma la vuelve
 * a renderizar. La deduplicación de 30 segundos tapa el caso normal —alguien
 * llega, ve que está en castellano y toca EN— pero no al que mira la carta un
 * rato y recién después cambia. Ese escaneo de más iría a las estadísticas que
 * el restaurante paga por mirar, así que se corta con este parámetro.
 *
 * Si alguien lo agrega a mano, lo único que consigue es que no se cuente su
 * propio escaneo.
 */
export const PARAM_CAMBIO_DE_IDIOMA = "idioma";

export function esIdioma(valor: string | undefined | null): valor is Idioma {
  return !!valor && (IDIOMAS as readonly string[]).includes(valor);
}

/**
 * Los idiomas que pide el navegador, del más querido al menos.
 *
 * `Accept-Language` viene como "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7". Se
 * ordena por el peso `q` y se descartan los de peso 0, que significan
 * explícitamente "este no".
 */
function idiomasPedidos(header: string | null): string[] {
  if (!header) return [];

  return header
    .split(",")
    .map((parte) => {
      const [etiqueta, ...parametros] = parte.trim().split(";");
      const q = parametros.find((p) => p.trim().startsWith("q="));
      const peso = q ? Number.parseFloat(q.split("=")[1]) : 1;
      return { etiqueta: etiqueta.trim(), peso: Number.isFinite(peso) ? peso : 0 };
    })
    .filter((x) => x.etiqueta && x.etiqueta !== "*" && x.peso > 0)
    .sort((a, b) => b.peso - a.peso)
    .map((x) => x.etiqueta);
}

/**
 * Qué idioma mostrarle a esta visita.
 *
 * El orden importa: la elección explícita de la persona gana siempre sobre lo
 * que diga su teléfono.
 *
 * La negociación la hace `@formatjs/intl-localematcher`, que implementa el
 * algoritmo de lookup de BCP 47. Es lo que resuelve bien los casos que una
 * comparación de strings falla: "en-GB" cae en "en", "it-CH" cae en "it".
 * Puede tirar excepción con una etiqueta mal formada —cualquiera puede mandar
 * un header a mano— y por eso va con red.
 */
export function resolverIdioma(
  cookie: string | undefined,
  acceptLanguage: string | null
): Idioma {
  if (esIdioma(cookie)) return cookie;

  const pedidos = idiomasPedidos(acceptLanguage);
  if (pedidos.length === 0) return IDIOMA_POR_DEFECTO;

  try {
    return match(pedidos, IDIOMAS as readonly string[], IDIOMA_POR_DEFECTO) as Idioma;
  } catch {
    return IDIOMA_POR_DEFECTO;
  }
}
