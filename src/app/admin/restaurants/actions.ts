"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, restaurants } from "@/db";
import {
  getBraceletCodesOfRestaurant,
  getRestaurantById,
  getRestaurantBySlug,
} from "@/db/queries/restaurants";
import { invalidateBracelet } from "@/lib/redirect-cache";
import { requireSession } from "@/lib/session";
import {
  fail,
  ok,
  readInt,
  readString,
  slugify,
  validateName,
  validateSlug,
  type ActionResult,
} from "@/lib/validation";

function revalidateRestaurantViews(id?: number) {
  revalidatePath("/admin/restaurants");
  revalidatePath("/admin/bracelets");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/restaurants/${id}`);
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

export async function createRestaurant(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const name = readString(formData.get("name"));
  // Si no mandan slug, lo derivamos del nombre.
  const slug = readString(formData.get("slug")) || slugify(name);

  const nameError = validateName(name);
  if (nameError) return fail(nameError);

  const slugError = validateSlug(slug);
  if (slugError) return fail(slugError);

  try {
    const existing = await getRestaurantBySlug(slug);
    if (existing) return fail(`Ya existe un restaurante con el slug "${slug}".`);

    await db.insert(restaurants).values({ name, slug, active: true });

    revalidateRestaurantViews();
    return ok();
  } catch (cause) {
    if (isDuplicateKeyError(cause)) {
      return fail(`Ya existe un restaurante con el slug "${slug}".`);
    }
    console.error("[restaurants] no se pudo crear el restaurante", { slug, cause });
    return fail("No se pudo crear el restaurante. Probá de nuevo.");
  }
}

export async function updateRestaurant(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const id = readInt(formData.get("id"));
  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug"));

  if (!id) return fail("Falta el identificador del restaurante.");

  const nameError = validateName(name);
  if (nameError) return fail(nameError);

  const slugError = validateSlug(slug);
  if (slugError) return fail(slugError);

  try {
    const current = await getRestaurantById(id);
    if (!current) return fail("El restaurante ya no existe.");

    await db.update(restaurants).set({ name, slug }).where(eq(restaurants.id, id));

    revalidateRestaurantViews(id);
    return ok();
  } catch (cause) {
    if (isDuplicateKeyError(cause)) {
      return fail(`Ya existe otro restaurante con el slug "${slug}".`);
    }
    console.error("[restaurants] no se pudo actualizar el restaurante", { id, cause });
    return fail("No se pudo guardar el restaurante. Probá de nuevo.");
  }
}

/**
 * Activar o desactivar un restaurante afecta a todas sus pulseras: un
 * restaurante inactivo hace que /r/[code] devuelva la página de "no activa"
 * sin importar el estado de la pulsera. Por eso hay que invalidar el caché de
 * cada uno de sus códigos.
 */
export async function toggleRestaurant(
  id: number,
  active: boolean
): Promise<ActionResult> {
  await requireSession();

  try {
    const current = await getRestaurantById(id);
    if (!current) return fail("El restaurante ya no existe.");

    await db.update(restaurants).set({ active }).where(eq(restaurants.id, id));

    const codes = await getBraceletCodesOfRestaurant(id);
    for (const code of codes) invalidateBracelet(code);

    revalidateRestaurantViews(id);
    return ok();
  } catch (cause) {
    console.error("[restaurants] no se pudo cambiar el estado", { id, cause });
    return fail("No se pudo cambiar el estado del restaurante.");
  }
}
