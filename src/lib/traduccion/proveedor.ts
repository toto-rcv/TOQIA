import { IDIOMA_POR_DEFECTO, IDIOMAS, type Idioma } from "@/i18n/locales";

/**
 * El traductor automático.
 *
 * Detrás de una interfaz y no llamando al servicio desde donde haga falta: el
 * día que cambie el proveedor se toca este archivo y nada más. Es lo que
 * permitió sacar DeepL sin mover una línea del resto del sistema.
 *
 * **No hay claves ni variables de entorno.** Antes esto era DeepL con
 * `DEEPL_API_KEY`. Una clave que hay que sacar, pegar en el `.env` de cada
 * despliegue y renovar cuando se agota es justo la clase de cosa que se
 * olvida: el sistema seguía funcionando —los textos se mostraban en el idioma
 * del local— y nadie se enteraba de que hacía semanas que no se traducía nada.
 * Ahora arranca solo.
 *
 * **Dos servicios, en orden, y ninguno pide registro:**
 *
 *  1. **Google** (`translate_a/single`). Es el motor que usa el traductor web
 *     de Google. Gratis, sin clave, detecta el idioma de origen y es el que
 *     mejor resuelve un nombre de plato suelto. **No es una API pública
 *     documentada**: Google puede limitarlo por IP o cambiarlo sin avisar, y
 *     por eso no está solo.
 *  2. **MyMemory** (`api.mymemory.translated.net`). Sí es una API pública y
 *     gratuita, sin clave. Es el paracaídas: más lenta, un texto por pedido y
 *     con un tope diario por IP, pero cuando la primera falla mantiene la
 *     carta traducida en lugar de dejarla a medias.
 *
 * Si las dos fallan, cada texto se muestra tal como lo escribió el local —que
 * es exactamente lo que pasaba antes de que esto existiera—. Ninguna falla del
 * traductor puede impedir que alguien guarde un plato.
 */

export type Traduccion = {
  /** El texto traducido. Vacío si no se pudo traducir ese texto. */
  texto: string;
  /** Qué idioma detectó el proveedor en el original. */
  origen: Idioma | null;
};

const GOOGLE = "https://translate.googleapis.com/translate_a/single";
const MYMEMORY = "https://api.mymemory.translated.net/get";

/**
 * Si el proveedor no contesta, el guardado no puede quedarse colgado: el local
 * está esperando con el formulario abierto.
 */
const TIMEOUT_MS = 8_000;

/**
 * MyMemory rechaza los segmentos de más de 500 bytes. Una descripción larga no
 * entra, y mandarla igual devuelve un error que se guardaría como si fuera la
 * traducción.
 */
const MAX_BYTES_MYMEMORY = 500;

/**
 * Sin clave que verificar, siempre hay traductor. La función queda porque es
 * la pregunta que hacen `contenido.ts` y el backfill —"¿se puede traducir?"—
 * y porque el día que haya que apagarlo, se apaga acá.
 */
export function hayTraductor(): boolean {
  return true;
}

/** Los dos servicios usan los mismos códigos de dos letras que nosotros. */
function esIdioma(codigo: string | undefined): Idioma | null {
  if (!codigo) return null;
  const corto = codigo.slice(0, 2).toLowerCase();
  return (IDIOMAS as readonly string[]).includes(corto) ? (corto as Idioma) : null;
}

/**
 * Traduce varios textos a un idioma.
 *
 * Un pedido por texto y no uno por lista: es la contra de haber dejado DeepL,
 * que aceptaba lotes. A cambio, lo que se traduce de una vez es una sola
 * entidad —un plato son dos textos, un local cinco— y los pedidos van en
 * paralelo, así que el formulario espera un viaje, no cinco.
 *
 * Devuelve un arreglo del mismo largo que `textos`, con la traducción vacía en
 * los que fallaron, o `null` si no se pudo traducir ninguno. Quien llama decide
 * qué hacer; en este sistema, dejar el original.
 */
export async function traducir(
  textos: string[],
  destino: Idioma
): Promise<Traduccion[] | null> {
  if (textos.length === 0) return null;

  const resultados = await Promise.all(
    textos.map((texto) => traducirUno(texto, destino))
  );

  // Todos fallaron: es una caída del proveedor, no un texto raro. Se avisa
  // como tal para que el que llama no borre lo que ya tenía guardado.
  if (resultados.every((r) => r.texto === "")) return null;

  return resultados;
}

/** Google primero; si no contesta o contesta cualquier cosa, MyMemory. */
async function traducirUno(texto: string, destino: Idioma): Promise<Traduccion> {
  const conGoogle = await traducirConGoogle(texto, destino);
  if (conGoogle) return conGoogle;

  const conMyMemory = await traducirConMyMemory(texto, destino);
  if (conMyMemory) return conMyMemory;

  return { texto: "", origen: null };
}

/**
 * Google.
 *
 * La respuesta es un arreglo anidado sin nombres de campo: el primer elemento
 * son los fragmentos traducidos (una oración larga vuelve partida en varios) y
 * el tercero es el idioma que detectó. Se lee con cuidado porque nada garantiza
 * su forma: es un endpoint interno, no un contrato.
 */
async function traducirConGoogle(
  texto: string,
  destino: Idioma
): Promise<Traduccion | null> {
  const url =
    `${GOOGLE}?client=gtx&dt=t&sl=auto&tl=${destino}&q=${encodeURIComponent(texto)}`;

  try {
    const respuesta = await fetch(url, {
      headers: {
        // Sin un User-Agent de navegador el endpoint responde 403.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      console.error("[traduccion] Google respondió", respuesta.status);
      return null;
    }

    const datos = (await respuesta.json()) as unknown;
    if (!Array.isArray(datos)) return null;

    const fragmentos = datos[0];
    if (!Array.isArray(fragmentos)) return null;

    const traducido = fragmentos
      .map((f) => (Array.isArray(f) && typeof f[0] === "string" ? f[0] : ""))
      .join("")
      .trim();

    if (traducido === "") return null;

    return {
      texto: traducido,
      origen: esIdioma(typeof datos[2] === "string" ? datos[2] : undefined),
    };
  } catch (cause) {
    console.error("[traduccion] no se pudo llamar a Google", cause);
    return null;
  }
}

/**
 * MyMemory.
 *
 * Necesita el idioma de origen —no lo detecta— así que se le dice castellano,
 * que es en el que carga su carta casi todo el mundo. Como no detecta nada,
 * devuelve `origen: null` y el que llama no saltea ningún idioma: en el peor
 * caso se traduce el castellano al castellano, que devuelve el mismo texto.
 *
 * Cuando se agota el cupo del día, la respuesta llega con 200 y el aviso
 * escrito dentro de `translatedText`. Sin esta comprobación, "MYMEMORY
 * WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" quedaría
 * guardado como el nombre de un plato.
 */
async function traducirConMyMemory(
  texto: string,
  destino: Idioma
): Promise<Traduccion | null> {
  if (destino === IDIOMA_POR_DEFECTO) return null;
  if (Buffer.byteLength(texto, "utf8") > MAX_BYTES_MYMEMORY) return null;

  const url =
    `${MYMEMORY}?q=${encodeURIComponent(texto)}` +
    `&langpair=${IDIOMA_POR_DEFECTO}|${destino}`;

  try {
    const respuesta = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      console.error("[traduccion] MyMemory respondió", respuesta.status);
      return null;
    }

    const datos = (await respuesta.json()) as {
      responseStatus?: number | string;
      responseData?: { translatedText?: string };
    };

    if (Number(datos.responseStatus) !== 200) return null;

    const traducido = (datos.responseData?.translatedText ?? "").trim();
    if (traducido === "" || traducido.toUpperCase().includes("MYMEMORY WARNING")) {
      console.error("[traduccion] MyMemory sin cupo o sin resultado");
      return null;
    }

    return { texto: traducido, origen: null };
  } catch (cause) {
    console.error("[traduccion] no se pudo llamar a MyMemory", cause);
    return null;
  }
}
