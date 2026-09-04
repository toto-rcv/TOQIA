"use server";

import { and, eq, gt, lt, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

function limpiarPrecio(valor: string): { precio: string | null; error?: string } {
  const texto = valor.trim();
  if (texto === "") return { precio: null };

  // Se acepta coma o punto: en España y Argentina la gente escribe "12,50".
  const numero = Number(texto.replace(",", "."));
  if (!Number.isFinite(numero) || numero < 0) {
    return { precio: null, error: "El precio tiene que ser un número positivo." };
  }
  if (numero > 99_999_999) {
    return { precio: null, error: "El precio es demasiado grande." };
  }

  return { precio: numero.toFixed(2) };
}

/* ── Categorías ──────────────────────────────────────────────────────────── */

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  const locationId = readInt(formData.get("locationId"));
  const name = readString(formData.get("name"));
  const description = readString(formData.get("description"));
  // El id del ícono se valida contra el catálogo: lo que no está en la lista
  // se guarda como null en vez de confiar en lo que mandó el formulario.
  const icon = normalizeMenuIcon(readString(formData.get("icon")));

  if (!locationId) return fail("Elegí un local.");
  if (name === "") return fail("La categoría necesita un nombre.");
  if (name.length > 120) return fail("El nombre no puede superar los 120 caracteres.");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    await db.insert(menuCategories).values({
      locationId,
      name,
      description: description === "" ? null : description.slice(0, 255),
      icon,
      position: await nextCategoryPosition(locationId),
      active: true,
    });

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo crear la categoría", { cause });
    return fail(mensajeDeError("No se pudo crear la categoría", cause));
  }
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  const id = readInt(formData.get("id"));
  const locationId = readInt(formData.get("locationId"));
  const name = readString(formData.get("name"));
  const description = readString(formData.get("description"));
  const icon = normalizeMenuIcon(readString(formData.get("icon")));

  if (!id || !locationId) return fail("Faltan datos de la categoría.");
  if (name === "") return fail("La categoría necesita un nombre.");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const actual = await getCategoryForLocation(id, locationId);
    if (!actual) return fail("La categoría ya no existe.");

    await db
      .update(menuCategories)
      .set({
        name,
        description: description === "" ? null : description.slice(0, 255),
        icon,
      })
      .where(eq(menuCategories.id, id));

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo actualizar la categoría", { id, cause });
    return fail(mensajeDeError("No se pudo guardar la categoría", cause));
  }
}

export async function toggleCategory(
  id: number,
  locationId: number,
  active: boolean
): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const actual = await getCategoryForLocation(id, locationId);
    if (!actual) return fail("La categoría ya no existe.");

    await db
      .update(menuCategories)
      .set({ active })
      .where(eq(menuCategories.id, id));

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo cambiar el estado de la categoría", { id, cause });
    return fail(mensajeDeError("No se pudo cambiar el estado de la categoría", cause));
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

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const actual = await getCategoryForLocation(id, locationId);
    if (!actual) return fail("La categoría ya no existe.");

    // Los platos caen por la clave foránea en cascada.
    await db.delete(menuCategories).where(eq(menuCategories.id, id));

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo borrar la categoría", { id, cause });
    return fail(mensajeDeError("No se pudo borrar la categoría", cause));
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

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const actual = await getCategoryForLocation(id, locationId);
    if (!actual) return fail("La categoría ya no existe.");

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
    return fail(mensajeDeError("No se pudo cambiar el orden", cause));
  }
}

/* ── Platos ──────────────────────────────────────────────────────────────── */

export async function createItem(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  const categoryId = readInt(formData.get("categoryId"));
  const locationId = readInt(formData.get("locationId"));
  const name = readString(formData.get("name"));
  const description = readString(formData.get("description"));
  const { precio, error: errorPrecio } = limpiarPrecio(
    readString(formData.get("price"))
  );

  if (!categoryId || !locationId) return fail("Faltan datos del plato.");
  if (name === "") return fail("El plato necesita un nombre.");
  if (name.length > 160) return fail("El nombre no puede superar los 160 caracteres.");
  if (errorPrecio) return fail(errorPrecio);

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const categoria = await getCategoryForLocation(categoryId, locationId);
    if (!categoria) return fail("La categoría elegida no existe.");

    const imageUrl = await resolverCampoDeArchivo({
      file: formData.get("imageFile"),
      quitar: false,
      actual: null,
      locationId,
      kind: "dish",
      formato: "imagen",
      etiqueta: "La foto del plato",
    });

    await db.insert(menuItems).values({
      categoryId,
      locationId,
      name,
      description: description === "" ? null : description.slice(0, 500),
      price: precio,
      imageUrl,
      position: await nextItemPosition(categoryId),
      available: true,
      active: true,
    });

    revalidar();
    return ok();
  } catch (cause) {
    if (cause instanceof ErrorDeArchivo) return fail(cause.message);
    console.error("[carta] no se pudo crear el plato", { cause });
    return fail(mensajeDeError("No se pudo crear el plato", cause));
  }
}

export async function updateItem(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  const id = readInt(formData.get("id"));
  const locationId = readInt(formData.get("locationId"));
  const categoryId = readInt(formData.get("categoryId"));
  const name = readString(formData.get("name"));
  const description = readString(formData.get("description"));
  const { precio, error: errorPrecio } = limpiarPrecio(
    readString(formData.get("price"))
  );

  if (!id || !locationId || !categoryId) return fail("Faltan datos del plato.");
  if (name === "") return fail("El plato necesita un nombre.");
  if (errorPrecio) return fail(errorPrecio);

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const actual = await getItemForLocation(id, locationId);
    if (!actual) return fail("El plato ya no existe.");

    const categoria = await getCategoryForLocation(categoryId, locationId);
    if (!categoria) return fail("La categoría elegida no existe.");

    // Si suben una foto nueva, la anterior se borra sola.
    const imageUrl = await resolverCampoDeArchivo({
      file: formData.get("imageFile"),
      quitar: formData.get("imageRemove") === "1",
      actual: actual.imageUrl,
      locationId,
      kind: "dish",
      formato: "imagen",
      etiqueta: "La foto del plato",
    });

    await db
      .update(menuItems)
      .set({
        categoryId,
        name,
        description: description === "" ? null : description.slice(0, 500),
        price: precio,
        imageUrl,
      })
      .where(eq(menuItems.id, id));

    revalidar();
    return ok();
  } catch (cause) {
    if (cause instanceof ErrorDeArchivo) return fail(cause.message);
    console.error("[carta] no se pudo actualizar el plato", { id, cause });
    return fail(mensajeDeError("No se pudo guardar el plato", cause));
  }
}

/** Marca un plato como disponible o agotado por hoy. */
export async function toggleItemAvailable(
  id: number,
  locationId: number,
  available: boolean
): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const actual = await getItemForLocation(id, locationId);
    if (!actual) return fail("El plato ya no existe.");

    await db.update(menuItems).set({ available }).where(eq(menuItems.id, id));

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo cambiar la disponibilidad", { id, cause });
    return fail(mensajeDeError("No se pudo cambiar la disponibilidad", cause));
  }
}

export async function deleteItem(
  id: number,
  locationId: number
): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const actual = await getItemForLocation(id, locationId);
    if (!actual) return fail("El plato ya no existe.");

    await db.delete(menuItems).where(eq(menuItems.id, id));
    // La foto no sirve para nada sin su plato.
    await borrarArchivoDeUrl(actual.imageUrl, locationId);

    revalidar();
    return ok();
  } catch (cause) {
    console.error("[carta] no se pudo borrar el plato", { id, cause });
    return fail(mensajeDeError("No se pudo borrar el plato", cause));
  }
}

export async function moveItem(
  id: number,
  locationId: number,
  direccion: "arriba" | "abajo"
): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const actual = await getItemForLocation(id, locationId);
    if (!actual) return fail("El plato ya no existe.");

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
    return fail(mensajeDeError("No se pudo cambiar el orden", cause));
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

  const locationId = readInt(formData.get("locationId"));
  if (!locationId) return fail("Falta el identificador del local.");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    const menuHeaderImageUrl = await resolverCampoDeArchivo({
      file: formData.get("headerFile"),
      quitar: formData.get("headerRemove") === "1",
      actual: local.menuHeaderImageUrl,
      locationId,
      kind: "menu_header",
      formato: "imagen",
      etiqueta: "La imagen de la carta",
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
    return fail(mensajeDeError("No se pudo guardar la imagen", cause));
  }
}
