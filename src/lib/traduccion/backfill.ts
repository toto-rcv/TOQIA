import { db, contentTranslations, locations, menuCategories, menuItems } from "@/db";
import { IDIOMAS } from "@/i18n/locales";

import { CAMPOS_TRADUCIBLES, traducirYGuardar, type Entidad } from "./contenido";
import { hayTraductor } from "./proveedor";

/**
 * Traducción de todo lo que ya estaba cargado.
 *
 * Desde que existe `traducirYGuardar`, cada plato que alguien guarda queda
 * traducido solo. Pero lo cargado *antes* de eso no: nadie va a volver a abrir
 * y guardar ciento veinte platos uno por uno para que se traduzcan.
 *
 * Esto recorre la base entera y traduce lo que falte. Es idempotente —lo que ya
 * está traducido y sin cambios no se vuelve a pedir— así que se puede correr
 * las veces que haga falta sin gastar cuota de más. Vive en
 * `/admin/mantenimiento`, junto a las migraciones, que es el otro trabajo de
 * este tipo: cosas que se corren una vez cuando se sube un cambio.
 */

export type ResultadoBackfill = {
  /** Entidades a las que se les pidió traducción en esta corrida. */
  traducidas: number;
  /** Entidades que ya estaban al día y no costaron nada. */
  yaEstaban: number;
  /** Filas de traducción en la base al terminar. */
  filas: number;
  /** false si no hay DEEPL_API_KEY: no se hizo nada y hay que decirlo. */
  hayTraductor: boolean;
};

/**
 * Cuántas entidades siguen sin traducir del todo.
 *
 * Es lo que muestra la página antes de que nadie apriete el botón, para no
 * ofrecer "traducir 0 cosas". Cuenta por lo alto: una entidad con texto y con
 * menos de siete filas por campo está incompleta.
 */
export async function contarPendientes(): Promise<{
  pendientes: number;
  filas: number;
}> {
  const [cats, items, locs, filas] = await Promise.all([
    db
      .select({ id: menuCategories.id, name: menuCategories.name })
      .from(menuCategories),
    db.select({ id: menuItems.id, name: menuItems.name }).from(menuItems),
    db
      .select({
        id: locations.id,
        welcomeTitle: locations.welcomeTitle,
        tagline: locations.tagline,
        closingMessage: locations.closingMessage,
      })
      .from(locations),
    db
      .select({
        entity: contentTranslations.entity,
        entityId: contentTranslations.entityId,
        locale: contentTranslations.locale,
      })
      .from(contentTranslations),
  ]);

  // Cuántos idiomas distintos tiene ya cada entidad.
  const cubiertos = new Map<string, Set<string>>();
  for (const fila of filas) {
    const clave = `${fila.entity}:${fila.entityId}`;
    const set = cubiertos.get(clave) ?? new Set<string>();
    set.add(fila.locale);
    cubiertos.set(clave, set);
  }

  const completa = (entidad: Entidad, id: number) =>
    (cubiertos.get(`${entidad}:${id}`)?.size ?? 0) >= IDIOMAS.length;

  let pendientes = 0;

  for (const fila of cats) {
    if (fila.name.trim() && !completa("menu_category", fila.id)) pendientes++;
  }
  for (const fila of items) {
    if (fila.name.trim() && !completa("menu_item", fila.id)) pendientes++;
  }
  for (const fila of locs) {
    const tieneTexto = [fila.welcomeTitle, fila.tagline, fila.closingMessage].some(
      (valor) => typeof valor === "string" && valor.trim() !== ""
    );
    if (tieneTexto && !completa("location", fila.id)) pendientes++;
  }

  return { pendientes, filas: filas.length };
}

/**
 * Traduce todo el contenido pendiente.
 *
 * De a una entidad y en serie, no todas en paralelo: son siete pedidos a DeepL
 * por entidad, y trescientos platos en paralelo serían dos mil pedidos
 * simultáneos — la API devuelve 429 y se pierde la mitad. En serie tarda más y
 * termina bien, que para algo que se corre una vez es el intercambio correcto.
 */
export async function traducirTodoElContenido(): Promise<ResultadoBackfill> {
  if (!hayTraductor()) {
    const { filas } = await contarPendientes();
    return { traducidas: 0, yaEstaban: 0, filas, hayTraductor: false };
  }

  const antes = await contarPendientes();

  const [cats, items, locs] = await Promise.all([
    db
      .select({
        id: menuCategories.id,
        name: menuCategories.name,
        description: menuCategories.description,
      })
      .from(menuCategories),
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
      })
      .from(menuItems),
    db
      .select({
        id: locations.id,
        tagline: locations.tagline,
        welcomeKicker: locations.welcomeKicker,
        welcomeTitle: locations.welcomeTitle,
        closingMessage: locations.closingMessage,
        menuButtonLabel: locations.menuButtonLabel,
      })
      .from(locations),
  ]);

  const trabajos: Array<{ entidad: Entidad; fila: Record<string, unknown> }> = [
    ...cats.map((fila) => ({ entidad: "menu_category" as const, fila })),
    ...items.map((fila) => ({ entidad: "menu_item" as const, fila })),
    ...locs.map((fila) => ({ entidad: "location" as const, fila })),
  ];

  for (const { entidad, fila } of trabajos) {
    // Sin texto no hay nada que traducir y no vale gastar un viaje a DeepL.
    const tieneTexto = (CAMPOS_TRADUCIBLES[entidad] as readonly string[]).some(
      (campo) => {
        const valor = fila[campo];
        return typeof valor === "string" && valor.trim() !== "";
      }
    );
    if (!tieneTexto) continue;

    await traducirYGuardar(entidad, fila.id as number, fila);
  }

  const despues = await contarPendientes();

  return {
    // Lo que dejó de estar pendiente es lo que efectivamente se tradujo.
    traducidas: Math.max(0, antes.pendientes - despues.pendientes),
    yaEstaban: trabajos.length - antes.pendientes,
    filas: despues.filas,
    hayTraductor: true,
  };
}
