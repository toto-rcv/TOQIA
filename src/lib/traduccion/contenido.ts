import { createHash } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";

import { contentTranslations, db } from "@/db";
import { IDIOMA_POR_DEFECTO, IDIOMAS, type Idioma } from "@/i18n/locales";

import { hayTraductor, traducir } from "./proveedor";

/**
 * Traducción del contenido que carga cada local.
 *
 * El problema que resuelve: la interfaz está traducida en `messages/*.json`,
 * pero "Milanesa napolitana" y "Tabla de quesos de la casa" los escribe el
 * restaurante y no hay archivo de mensajes que los contenga. Un cliente alemán
 * veía la página en alemán y la carta en español.
 *
 * **Cuándo se traduce: al guardar, no al mostrar.**
 *
 * Traducir al mostrar sería una llamada a DeepL en el camino crítico de una
 * página que se abre con el celular en la mano y con la conexión del local.
 * Traducir al guardar mueve ese costo al panel, donde ya se está esperando a
 * que un formulario responda, y la carta pública queda con lo que siempre tuvo:
 * una consulta a la base.
 *
 * **Qué pasa si DeepL no contesta.** Nada grave: se guarda igual y el texto se
 * muestra como lo escribió el local. Es exactamente lo que pasaba antes de que
 * esto existiera. Ninguna falla del traductor puede impedir que alguien guarde
 * un plato.
 */

/* ── Qué se traduce ───────────────────────────────────────────────────────── */

export type Entidad = "menu_category" | "menu_item" | "location";

/**
 * Los campos traducibles de cada entidad.
 *
 * Lo que **no** está acá es tan importante como lo que sí: el nombre del local
 * no se traduce (una marca no se traduce), ni la dirección, ni los teléfonos,
 * ni las URLs. Traducir "Bar La Esquina" al alemán sería un error, no una
 * mejora.
 */
export const CAMPOS_TRADUCIBLES = {
  menu_category: ["name", "description"],
  menu_item: ["name", "description"],
  location: [
    "tagline",
    "welcomeKicker",
    "welcomeTitle",
    "closingMessage",
    "menuButtonLabel",
  ],
} as const satisfies Record<Entidad, readonly string[]>;

/** Un texto original y su huella. */
type Pendiente = { campo: string; texto: string; huella: string };

/**
 * Identifica la versión de un texto.
 *
 * sha1 y no una comparación contra el valor guardado porque la fila guardada
 * es la *traducción*, no el original: sin la huella no hay forma de saber si
 * el francés que está en la base salió del nombre de plato que hay ahora o del
 * que había antes de la última edición.
 */
function huellaDe(texto: string): string {
  return createHash("sha1").update(texto).digest("hex");
}

/** Deja solo los campos traducibles que tienen texto de verdad. */
function textosDe(entidad: Entidad, campos: Record<string, unknown>): Pendiente[] {
  const permitidos = CAMPOS_TRADUCIBLES[entidad] as readonly string[];
  const salida: Pendiente[] = [];

  for (const campo of permitidos) {
    const valor = campos[campo];
    if (typeof valor !== "string") continue;
    const texto = valor.trim();
    if (!texto) continue;
    salida.push({ campo, texto, huella: huellaDe(texto) });
  }

  return salida;
}

/* ── Escritura: al guardar en el panel ────────────────────────────────────── */

/**
 * Traduce y guarda los textos de una entidad a los siete idiomas.
 *
 * Se llama después de cada `INSERT`/`UPDATE` del panel. Es idempotente y
 * barata cuando no hay nada nuevo: si el texto no cambió desde la última vez,
 * la huella coincide y la función se va sin llamar a DeepL. Guardar el precio
 * de un plato veinte veces no cuesta veinte traducciones: cuesta cero.
 *
 * Nunca lanza. El guardado del panel ya terminó cuando esto corre, y que la
 * traducción falle no puede convertirse en un error para el usuario.
 */
export async function traducirYGuardar(
  entidad: Entidad,
  entityId: number,
  campos: Record<string, unknown>
): Promise<void> {
  try {
    const pendientes = textosDe(entidad, campos);

    // Los campos que quedaron vacíos —el local borró la descripción— no pueden
    // dejar su traducción vieja dando vueltas: se mostraría un texto que ya no
    // existe en el original.
    const conTexto = new Set(pendientes.map((p) => p.campo));
    const aBorrar = (CAMPOS_TRADUCIBLES[entidad] as readonly string[]).filter(
      (campo) => !conTexto.has(campo)
    );
    if (aBorrar.length > 0) {
      await db
        .delete(contentTranslations)
        .where(
          and(
            eq(contentTranslations.entity, entidad),
            eq(contentTranslations.entityId, entityId),
            inArray(contentTranslations.field, aBorrar)
          )
        );
    }

    if (pendientes.length === 0 || !hayTraductor()) return;

    // Qué falta traducir de verdad. Un campo se rehace entero (los siete
    // idiomas) o no se toca: media traducción vieja y media nueva sería peor
    // que ninguna.
    const guardadas = await db
      .select({
        field: contentTranslations.field,
        locale: contentTranslations.locale,
        sourceHash: contentTranslations.sourceHash,
      })
      .from(contentTranslations)
      .where(
        and(
          eq(contentTranslations.entity, entidad),
          eq(contentTranslations.entityId, entityId)
        )
      );

    const alDia = new Map<string, Set<string>>();
    for (const fila of guardadas) {
      const clave = `${fila.field}:${fila.sourceHash}`;
      const set = alDia.get(clave) ?? new Set<string>();
      set.add(fila.locale);
      alDia.set(clave, set);
    }

    const faltantes = pendientes.filter((p) => {
      const idiomas = alDia.get(`${p.campo}:${p.huella}`);
      return !idiomas || IDIOMAS.some((idioma) => !idiomas.has(idioma));
    });

    if (faltantes.length === 0) return;

    const filas = await pedirTraducciones(faltantes);
    if (filas.length === 0) return;

    // Primero afuera lo viejo de esos campos: si el original cambió, sus
    // traducciones anteriores no sirven, y las que DeepL no haya devuelto esta
    // vez tienen que faltar (se muestra el original) en lugar de seguir
    // mostrando el plato anterior traducido.
    await db
      .delete(contentTranslations)
      .where(
        and(
          eq(contentTranslations.entity, entidad),
          eq(contentTranslations.entityId, entityId),
          inArray(
            contentTranslations.field,
            faltantes.map((p) => p.campo)
          )
        )
      );

    await db
      .insert(contentTranslations)
      .values(
        filas.map((fila) => ({
          entity: entidad,
          entityId,
          field: fila.campo,
          locale: fila.idioma,
          value: fila.texto,
          sourceHash: fila.huella,
        }))
      )
      // Dos guardados simultáneos del mismo plato son raros pero posibles; sin
      // esto, el segundo explotaría contra el índice único.
      .onDuplicateKeyUpdate({
        set: {
          value: sql`values(${contentTranslations.value})`,
          sourceHash: sql`values(${contentTranslations.sourceHash})`,
        },
      });
  } catch (error) {
    console.error("[traduccion] no se pudo guardar la traducción", {
      entidad,
      entityId,
      error,
    });
  }
}

type FilaTraducida = {
  campo: string;
  idioma: Idioma;
  texto: string;
  huella: string;
};

/**
 * Le pide a DeepL todos los textos en todos los idiomas.
 *
 * Dos detalles que cambian mucho la factura:
 *
 *  1. **Un pedido por idioma, no uno por texto.** Toda la lista viaja junta.
 *  2. **El idioma original no se le pide a nadie.** El primer pedido devuelve
 *     qué idioma detectó DeepL; para ese idioma se guarda el texto tal cual,
 *     que es mejor traducción que cualquier ida y vuelta.
 *
 * Guardar también el idioma original —en vez de dejar esa fila vacía— hace que
 * leer sea uniforme: la carta pide su idioma y siempre encuentra algo, sin
 * tener que saber en qué idioma escribe cada local.
 */
async function pedirTraducciones(
  pendientes: Pendiente[]
): Promise<FilaTraducida[]> {
  const textos = pendientes.map((p) => p.texto);

  // El primero va solo porque de su respuesta sale el idioma original, y eso
  // decide cuáles de los otros seis hace falta pedir.
  //
  // Y no es el primero de la lista: el primero es el castellano, que es
  // justamente el idioma en el que casi todos los locales cargan su carta.
  // Sondear con él sería gastar un pedido en traducir el español al español.
  const primero = IDIOMAS.find((idioma) => idioma !== IDIOMA_POR_DEFECTO)!;
  const inicial = await traducir(textos, primero);
  if (!inicial) return [];

  const origen = inicial.find((t) => t.origen)?.origen ?? null;

  const porIdioma = new Map<Idioma, string[]>();
  porIdioma.set(
    primero,
    inicial.map((t) => t.texto)
  );

  const restantes = IDIOMAS.filter(
    (idioma) => idioma !== primero && idioma !== origen
  );

  // En paralelo: son seis pedidos independientes y el usuario está esperando
  // con el formulario abierto.
  const respuestas = await Promise.all(
    restantes.map(async (idioma) => [idioma, await traducir(textos, idioma)] as const)
  );

  for (const [idioma, respuesta] of respuestas) {
    if (respuesta) porIdioma.set(idioma, respuesta.map((t) => t.texto));
  }

  const filas: FilaTraducida[] = [];

  pendientes.forEach((pendiente, i) => {
    for (const idioma of IDIOMAS) {
      const texto =
        idioma === origen ? pendiente.texto : porIdioma.get(idioma)?.[i];
      if (!texto) continue;
      filas.push({
        campo: pendiente.campo,
        idioma,
        texto,
        huella: pendiente.huella,
      });
    }
  });

  return filas;
}

/**
 * Borra las traducciones de algo que ya no existe.
 *
 * Hace falta porque la tabla es polimórfica y no tiene foreign key: MySQL no
 * puede limpiarla sola cuando se borra un plato.
 */
export async function olvidarTraducciones(
  entidad: Entidad,
  entityId: number
): Promise<void> {
  try {
    await db
      .delete(contentTranslations)
      .where(
        and(
          eq(contentTranslations.entity, entidad),
          eq(contentTranslations.entityId, entityId)
        )
      );
  } catch (error) {
    console.error("[traduccion] no se pudo borrar la traducción", {
      entidad,
      entityId,
      error,
    });
  }
}

/* ── Lectura: al mostrar la página pública ────────────────────────────────── */

/**
 * Las traducciones de un idioma para un conjunto de entidades.
 *
 * La clave del mapa es `"<id>:<campo>"`. Una sola consulta por entidad para
 * toda la carta: sesenta platos no son sesenta consultas.
 */
export type Traducciones = Map<string, string>;

export async function traduccionesDe(
  entidad: Entidad,
  ids: number[],
  idioma: Idioma
): Promise<Traducciones> {
  const mapa: Traducciones = new Map();
  if (ids.length === 0) return mapa;

  try {
    const filas = await db
      .select({
        entityId: contentTranslations.entityId,
        field: contentTranslations.field,
        value: contentTranslations.value,
      })
      .from(contentTranslations)
      .where(
        and(
          eq(contentTranslations.entity, entidad),
          eq(contentTranslations.locale, idioma),
          inArray(contentTranslations.entityId, ids)
        )
      );

    for (const fila of filas) {
      mapa.set(`${fila.entityId}:${fila.field}`, fila.value);
    }
  } catch (error) {
    // Que la tabla no exista todavía (base sin migrar) no puede tumbar la
    // carta de nadie: se muestra en el idioma en que la cargó el local.
    console.error("[traduccion] no se pudieron leer las traducciones", error);
  }

  return mapa;
}

/**
 * Reemplaza los campos traducidos de un objeto, dejando el original donde no
 * haya traducción.
 *
 * El `?? original` no es una precaución teórica: es lo que se ve cuando el
 * local acaba de cargar un plato y DeepL estaba caído, o cuando el sistema
 * corre sin `DEEPL_API_KEY`.
 */
/**
 * Los textos del local (título de bienvenida, mensaje de cierre, etiqueta del
 * botón de menú) en el idioma pedido.
 *
 * Aparte de `conTraduccion` porque el objeto de la landing no lleva el `id` del
 * local adentro: viaja armado desde `queries/landing.ts` con lo justo para
 * pintar la página.
 */
export async function landingTraducida<T extends Record<string, unknown>>(
  locationId: number,
  landing: T,
  idioma: Idioma
): Promise<T> {
  const traducciones = await traduccionesDe("location", [locationId], idioma);
  if (traducciones.size === 0) return landing;

  let copia: T | null = null;

  for (const campo of CAMPOS_TRADUCIBLES.location as readonly string[]) {
    const traducido = traducciones.get(`${locationId}:${campo}`);
    if (!traducido || traducido === landing[campo]) continue;
    copia ??= { ...landing };
    (copia as Record<string, unknown>)[campo] = traducido;
  }

  return copia ?? landing;
}

export function conTraduccion<T extends Record<string, unknown>>(
  entidad: Entidad,
  fila: T & { id: number },
  traducciones: Traducciones
): T {
  if (traducciones.size === 0) return fila;

  let copia: T | null = null;

  for (const campo of CAMPOS_TRADUCIBLES[entidad] as readonly string[]) {
    const traducido = traducciones.get(`${fila.id}:${campo}`);
    if (!traducido || traducido === fila[campo]) continue;
    copia ??= { ...fila };
    (copia as Record<string, unknown>)[campo] = traducido;
  }

  return copia ?? fila;
}
