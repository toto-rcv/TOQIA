import { IDIOMAS, type Idioma } from "@/i18n/locales";
import { env } from "@/lib/env";

/**
 * El traductor automático.
 *
 * Detrás de una interfaz y no llamando a DeepL desde donde haga falta: el día
 * que cambie el proveedor —o que haya que apagarlo porque se acabó la cuota—
 * se toca este archivo y nada más.
 *
 * Sin `DEEPL_API_KEY` no hay traducción automática y el sistema sigue
 * funcionando: cada texto se muestra tal como lo escribió el local. Es lo que
 * pasaba antes de que esto existiera, así que una clave vencida degrada el
 * producto pero no lo rompe.
 */

export type Traduccion = {
  /** El texto traducido. */
  texto: string;
  /** Qué idioma detectó el proveedor en el original. */
  origen: Idioma | null;
};

/**
 * DeepL cobra por carácter de origen **y por idioma de destino**, así que
 * traducir un texto a seis idiomas cuesta seis veces su largo. Por eso todo lo
 * que se traduce se guarda en la base y solo se vuelve a pedir cuando el
 * original cambia (ver `contenido.ts`).
 */
const ENDPOINT_GRATIS = "https://api-free.deepl.com/v2/translate";
const ENDPOINT_PRO = "https://api.deepl.com/v2/translate";

/** Los códigos de destino de DeepL no son exactamente los nuestros. */
const DESTINO_DEEPL: Record<Idioma, string> = {
  es: "ES",
  // DeepL exige elegir variante de inglés: la británica, que es la bandera
  // que muestra el selector.
  en: "EN-GB",
  it: "IT",
  fr: "FR",
  de: "DE",
  nl: "NL",
  ru: "RU",
};

/** Al revés, para leer el idioma que DeepL dice haber detectado. */
function idiomaDetectado(codigo: string | undefined): Idioma | null {
  if (!codigo) return null;
  const corto = codigo.slice(0, 2).toLowerCase();
  return (IDIOMAS as readonly string[]).includes(corto) ? (corto as Idioma) : null;
}

export function hayTraductor(): boolean {
  return env.deeplApiKey !== null;
}

/**
 * Traduce varios textos a un idioma, en un solo pedido.
 *
 * Por lotes y no de a uno: una carta de sesenta platos son ciento veinte
 * textos, y ciento veinte pedidos HTTP secuenciales tardarían más de lo que
 * nadie está dispuesto a esperar con el botón de guardar apretado.
 *
 * Devuelve `null` si no hay traductor configurado o si el pedido falló. Quien
 * llama decide qué hacer; en este sistema, dejar el original.
 */
export async function traducir(
  textos: string[],
  destino: Idioma
): Promise<Traduccion[] | null> {
  const clave = env.deeplApiKey;
  if (!clave || textos.length === 0) return null;

  // Las claves gratuitas terminan en ":fx" y pegan a otro host. Deducirlo
  // evita una variable de entorno más que alguien puede poner mal.
  const url = clave.endsWith(":fx") ? ENDPOINT_GRATIS : ENDPOINT_PRO;

  try {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: textos,
        target_lang: DESTINO_DEEPL[destino],
        // Sin `source_lang`: el local puede cargar su carta en cualquier
        // idioma y DeepL lo detecta. Lo que detectó vuelve en la respuesta y
        // se usa para no traducir el original contra sí mismo.
        //
        // Los nombres de plato son títulos sueltos, no oraciones: sin esto
        // DeepL les agrega puntos y mayúsculas de oración.
        preserve_formatting: true,
      }),
      // Si DeepL no contesta, el guardado no puede quedarse colgado: el local
      // está esperando con el formulario abierto.
      signal: AbortSignal.timeout(15_000),
    });

    if (!respuesta.ok) {
      console.error("[traduccion] DeepL respondió", respuesta.status, await respuesta.text());
      return null;
    }

    const datos = (await respuesta.json()) as {
      translations?: Array<{ text: string; detected_source_language?: string }>;
    };

    if (!datos.translations || datos.translations.length !== textos.length) {
      console.error("[traduccion] DeepL devolvió una cantidad de textos distinta");
      return null;
    }

    return datos.translations.map((t) => ({
      texto: t.text,
      origen: idiomaDetectado(t.detected_source_language),
    }));
  } catch (cause) {
    console.error("[traduccion] no se pudo llamar a DeepL", cause);
    return null;
  }
}
