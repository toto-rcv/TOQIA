"use server";

import { and, eq, gt, lt, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { db, locations, menuCategories, menuItems } from "@/db";
import {
  getBraceletCodesOfLocation,
  getLocationForAccount,
} from "@/db/queries/locations";
import {
  getCategoryForLocation,
  getItemForLocation,
  nextCategoryPosition,
  nextItemPosition,
} from "@/db/queries/menu";
import {
  borrarArchivoDeUrl,
  ErrorDeArchivo,
  resolverCampoDeArchivo,
} from "@/lib/media";
import { normalizeMenuIcon } from "@/lib/menu-icons";
import { invalidateBracelet } from "@/lib/redirect-cache";
import { mensajeDeError } from "@/lib/errores-db";
import { requireRestaurantUser } from "@/lib/session";
import {
  olvidarTraducciones,
  traducirYGuardar,
} from "@/lib/traduccion/contenido";
import {
  fail,
  ok,
  readInt,
  readString,
  type ActionResult,
} from "@/lib/validation";

/**
 * Edición de la carta, desde el panel del restaurante.
 *
 * Como en el resto del panel: `requireRestaurantUser()` primero, y todo id que
 * llega por formulario se vuelve a buscar filtrando por la cuenta de la
 * sesión. Nunca se confía en que el id sea propio.
 */

function revalidar() {
  revalidatePath("/panel/carta");
}

/** Devuelve una clave de `Errores` en `error`, no la frase ya escrita. */
function limpiarPrecio(valor: string): { precio: string | null; error?: string } {
  const texto = valor.trim();
  if (texto === "") return { precio: null };

  // Se acepta coma o punto: en España y Argentina la gente escribe "12,50".
  const numero = Number(texto.replace(",", "."));
  if (!Number.isFinite(numero) || numero < 0) {
    return { precio: null, error: "precioNoPositivo" };
  }
  if (numero > 99_999_999) {
    return { precio: null, error: "precioGrande" };
  }

  return { precio: numero.toFixed(2) };
}

/* ── Categorías ──────────────────────────────────────────────────────────── */

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  const locationId = readInt(formData.get("locationId"));
  const name = readString(formData.get("name"));
  const description = readString(formData.get("description"));
  // El id del ícono se valida contra el catálogo: lo que no está en la lista
  // se guarda como null en vez de confiar en lo que mandó el formulario.
  const icon = normalizeMenuIcon(readString(formData.get("icon")));

  if (!locationId) return fail(t("elegiUnLocal"));
  if (name === "") return fail(t("categoriaSinNombre"));
  if (name.length > 120) return fail(t("nombreLargo120"));

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const descripcion = description === "" ? null : description.slice(0, 255);

    const [insercion] = await db.insert(menuCategories).values({
      locationId,
      name,
      description: descripcion,
      icon,
      position: await nextCategoryPosition(locationId),
      active: true,
    });

    // Se traduce acá y no en la página pública: el costo cae en el panel, que
    // es donde alguien ya está esperando a que un formulario responda.
    await traducirYGuardar("menu_category", insercion.insertId, {
      name,
      description: descripcion,
    });

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo crear la categoría", { cause });
    return fail(await mensajeDeError("noSePudoCrearCategoria", cause));
  }
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  const id = readInt(formData.get("id"));
  const locationId = readInt(formData.get("locationId"));
  const name = readString(formData.get("name"));
  const description = readString(formData.get("description"));
  const icon = normalizeMenuIcon(readString(formData.get("icon")));

  if (!id || !locationId) return fail(t("faltanDatosCategoria"));
  if (name === "") return fail(t("categoriaSinNombre"));

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const actual = await getCategoryForLocation(id, locationId);
    if (!actual) return fail(t("categoriaNoExiste"));

    const descripcion = description === "" ? null : description.slice(0, 255);

    await db
      .update(menuCategories)
      .set({ name, description: descripcion, icon })
      .where(eq(menuCategories.id, id));

    await traducirYGuardar("menu_category", id, {
      name,
      description: descripcion,
    });

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo actualizar la categoría", { id, cause });
    return fail(await mensajeDeError("noSePudoGuardarCategoria", cause));
  }
}

export async function toggleCategory(
  id: number,
  locationId: number,
  active: boolean
): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const actual = await getCategoryForLocation(id, locationId);
    if (!actual) return fail(t("categoriaNoExiste"));

    await db
      .update(menuCategories)
      .set({ active })
      .where(eq(menuCategories.id, id));

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo cambiar el estado de la categoría", { id, cause });
    return fail(await mensajeDeError("noSePudoCambiarEstadoCategoria", cause));
  }
}

/**
 * Borra una categoría **con todos sus platos**.
 *
 * Es destructivo y no hay papelera, así que el diálogo del panel pide
 * confirmación explícita antes de llamar acá.
 */
export async function deleteCategory(
  id: number,
  locationId: number
): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const actual = await getCategoryForLocation(id, locationId);
    if (!actual) return fail(t("categoriaNoExiste"));

    // Los ids de los platos se leen antes de borrar: después de la cascada ya
    // no hay forma de saber cuáles eran para limpiar sus traducciones.
    const platos = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.categoryId, id));

    // Los platos caen por la clave foránea en cascada.
    await db.delete(menuCategories).where(eq(menuCategories.id, id));

    // La tabla de traducciones es polimórfica y no tiene clave foránea, así
    // que la cascada de MySQL no la alcanza (ver src/db/schema.ts).
    await Promise.all([
      olvidarTraducciones("menu_category", id),
      ...platos.map((plato) => olvidarTraducciones("menu_item", plato.id)),
    ]);

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo borrar la categoría", { id, cause });
    return fail(await mensajeDeError("noSePudoBorrarCategoria", cause));
  }
}

/**
 * Sube o baja una categoría en la carta.
 *
 * Intercambia la posición con su vecina en vez de renumerar todo: es una sola
 * operación, no deja huecos y no depende de que las posiciones sean
 * consecutivas.
 */
export async function moveCategory(
  id: number,
  locationId: number,
  direccion: "arriba" | "abajo"
): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const actual = await getCategoryForLocation(id, locationId);
    if (!actual) return fail(t("categoriaNoExiste"));

    const vecinas = await db
      .select()
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.locationId, locationId),
          direccion === "arriba"
            ? lt(menuCategories.position, actual.position)
            : gt(menuCategories.position, actual.position)
        )
      )
      .orderBy(
        direccion === "arriba"
          ? desc(menuCategories.position)
          : asc(menuCategories.position)
      )
      .limit(1);

    const vecina = vecinas[0];
    // Ya está en la punta: no es un error, simplemente no hay nada que mover.
    if (!vecina) return ok();

    await db
      .update(menuCategories)
      .set({ position: vecina.position })
      .where(eq(menuCategories.id, actual.id));
    await db
      .update(menuCategories)
      .set({ position: actual.position })
      .where(eq(menuCategories.id, vecina.id));

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo mover la categoría", { id, cause });
    return fail(await mensajeDeError("noSePudoCambiarOrden", cause));
  }
}

/* ── Platos ──────────────────────────────────────────────────────────────── */

export async function createItem(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  const categoryId = readInt(formData.get("categoryId"));
  const locationId = readInt(formData.get("locationId"));
  const name = readString(formData.get("name"));
  const description = readString(formData.get("description"));
  const { precio, error: errorPrecio } = limpiarPrecio(
    readString(formData.get("price"))
  );

  if (!categoryId || !locationId) return fail(t("faltanDatosPlato"));
  if (name === "") return fail(t("platoSinNombre"));
  if (name.length > 160) return fail(t("nombreLargo160"));
  if (errorPrecio) return fail(t(errorPrecio));

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const categoria = await getCategoryForLocation(categoryId, locationId);
    if (!categoria) return fail(t("categoriaElegidaNoExiste"));

    const imageUrl = await resolverCampoDeArchivo({
      file: formData.get("imageFile"),
      quitar: false,
      actual: null,
      locationId,
      kind: "dish",
      formato: "imagen",
      etiqueta: "fotoPlato",
    });

    const descripcion = description === "" ? null : description.slice(0, 500);

    const [insercion] = await db.insert(menuItems).values({
      categoryId,
      locationId,
      name,
      description: descripcion,
      price: precio,
      imageUrl,
      position: await nextItemPosition(categoryId),
      available: true,
      active: true,
    });

    await traducirYGuardar("menu_item", insercion.insertId, {
      name,
      description: descripcion,
    });

    revalidar();
    return ok();
  } catch (cause) {
    if (cause instanceof ErrorDeArchivo) return fail(cause.message);
    console.error("[carta] no se pudo crear el plato", { cause });
    return fail(await mensajeDeError("noSePudoCrearPlato", cause));
  }
}

export async function updateItem(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  const id = readInt(formData.get("id"));
  const locationId = readInt(formData.get("locationId"));
  const categoryId = readInt(formData.get("categoryId"));
  const name = readString(formData.get("name"));
  const description = readString(formData.get("description"));
  const { precio, error: errorPrecio } = limpiarPrecio(
    readString(formData.get("price"))
  );

  if (!id || !locationId || !categoryId) return fail(t("faltanDatosPlato"));
  if (name === "") return fail(t("platoSinNombre"));
  if (errorPrecio) return fail(t(errorPrecio));

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const actual = await getItemForLocation(id, locationId);
    if (!actual) return fail(t("platoNoExiste"));

    const categoria = await getCategoryForLocation(categoryId, locationId);
    if (!categoria) return fail(t("categoriaElegidaNoExiste"));

    // Si suben una foto nueva, la anterior se borra sola.
    const imageUrl = await resolverCampoDeArchivo({
      file: formData.get("imageFile"),
      quitar: formData.get("imageRemove") === "1",
      actual: actual.imageUrl,
      locationId,
      kind: "dish",
      formato: "imagen",
      etiqueta: "fotoPlato",
    });

    const descripcion = description === "" ? null : description.slice(0, 500);

    await db
      .update(menuItems)
      .set({
        categoryId,
        name,
        description: descripcion,
        price: precio,
        imageUrl,
      })
      .where(eq(menuItems.id, id));

    // Cambiar solo el precio no gasta una traducción: `traducirYGuardar`
    // compara la huella del texto y se va sin llamar a nadie.
    await traducirYGuardar("menu_item", id, { name, description: descripcion });

    revalidar();
    return ok();
  } catch (cause) {
    if (cause instanceof ErrorDeArchivo) return fail(cause.message);
    console.error("[carta] no se pudo actualizar el plato", { id, cause });
    return fail(await mensajeDeError("noSePudoGuardarPlato", cause));
  }
}

/** Marca un plato como disponible o agotado por hoy. */
export async function toggleItemAvailable(
  id: number,
  locationId: number,
  available: boolean
): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const actual = await getItemForLocation(id, locationId);
    if (!actual) return fail(t("platoNoExiste"));

    await db.update(menuItems).set({ available }).where(eq(menuItems.id, id));

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo cambiar la disponibilidad", { id, cause });
    return fail(await mensajeDeError("noSePudoCambiarDisponibilidad", cause));
  }
}

export async function deleteItem(
  id: number,
  locationId: number
): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const actual = await getItemForLocation(id, locationId);
    if (!actual) return fail(t("platoNoExiste"));

    await db.delete(menuItems).where(eq(menuItems.id, id));
    // La foto no sirve para nada sin su plato. Las traducciones tampoco.
    await borrarArchivoDeUrl(actual.imageUrl, locationId);
    await olvidarTraducciones("menu_item", id);

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo borrar el plato", { id, cause });
    return fail(await mensajeDeError("noSePudoBorrarPlato", cause));
  }
}

export async function moveItem(
  id: number,
  locationId: number,
  direccion: "arriba" | "abajo"
): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const actual = await getItemForLocation(id, locationId);
    if (!actual) return fail(t("platoNoExiste"));

    // El orden es dentro de la categoría, no de la carta entera.
    const vecinos = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.categoryId, actual.categoryId),
          direccion === "arriba"
            ? lt(menuItems.position, actual.position)
            : gt(menuItems.position, actual.position)
        )
      )
      .orderBy(
        direccion === "arriba" ? desc(menuItems.position) : asc(menuItems.position)
      )
      .limit(1);

    const vecino = vecinos[0];
    if (!vecino) return ok();

    await db
      .update(menuItems)
      .set({ position: vecino.position })
      .where(eq(menuItems.id, actual.id));
    await db
      .update(menuItems)
      .set({ position: actual.position })
      .where(eq(menuItems.id, vecino.id));

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo mover el plato", { id, cause });
    return fail(await mensajeDeError("noSePudoCambiarOrden", cause));
  }
}

/* ── Imagen de cabecera de la carta ──────────────────────────────────────── */

/**
 * La foto que encabeza la carta pública, arriba de las categorías.
 *
 * Vive en `locations` y no en la carta misma porque es del local, no de una
 * categoría: si mañana el restaurante reordena todo, la cabecera sigue igual.
 */
export async function updateMenuHeader(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();
  const t = await getTranslations("Errores");

  const locationId = readInt(formData.get("locationId"));
  if (!locationId) return fail(t("faltaIdLocal"));

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail(t("localNoExiste"));

    const menuHeaderImageUrl = await resolverCampoDeArchivo({
      file: formData.get("headerFile"),
      quitar: formData.get("headerRemove") === "1",
      actual: local.menuHeaderImageUrl,
      locationId,
      kind: "menu_header",
      formato: "imagen",
      etiqueta: "imagenCarta",
    });

    await db
      .update(locations)
      .set({ menuHeaderImageUrl })
      .where(eq(locations.id, locationId));

    // La cabecera viaja en el caché de la landing: sin invalidar, el cambio
    // tardaría hasta que venza el TTL.
    const codigos = await getBraceletCodesOfLocation(locationId);
    for (const code of codigos) invalidateBracelet(code);

    revalidar();
    return ok();
  } catch (cause) {
    if (cause instanceof ErrorDeArchivo) return fail(cause.message);
    console.error("[carta] no se pudo guardar la imagen de la carta", {
      locationId,
      cause,
    });
    return fail(await mensajeDeError("noSePudoGuardarImagen", cause));
  }
}
