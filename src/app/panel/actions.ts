"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { bracelets, db, locations, waiters } from "@/db";
import { getBraceletForAccount } from "@/db/queries/bracelets";
import {
  getBraceletCodesOfLocation,
  getLocationForAccount,
} from "@/db/queries/locations";
import { getWaiterForAccount } from "@/db/queries/waiters";
import { invalidateBracelet } from "@/lib/redirect-cache";
import { requireRestaurantUser } from "@/lib/session";
import {
  fail,
  ok,
  readInt,
  readString,
  validateName,
  validateOptionalUrl,
  validatePhone,
  type ActionResult,
} from "@/lib/validation";

/**
 * Acciones del panel del restaurante.
 *
 * Dos reglas en todas:
 *  1. `requireRestaurantUser()` primero. El layout no protege un POST directo
 *     contra una Server Action.
 *  2. Todo id que llega por formulario se vuelve a buscar filtrando por la
 *     cuenta de la sesión. Nunca se confía en que el id sea propio: sin eso,
 *     cambiar un número en el HTML permitiría editar el local de otro cliente.
 */

function revalidarPanel() {
  revalidatePath("/panel");
  revalidatePath("/panel/pulseras");
  revalidatePath("/panel/camareros");
  revalidatePath("/panel/configuracion");
}

/* ── Camareros ───────────────────────────────────────────────────────────── */

export async function createWaiter(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  const name = readString(formData.get("name"));
  const locationId = readInt(formData.get("locationId"));

  const errorNombre = validateName(name);
  if (errorNombre) return fail(errorNombre);
  if (!locationId) return fail("Elegí un local.");

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local elegido no existe.");

    await db.insert(waiters).values({ name, locationId, active: true });

    revalidarPanel();
    return ok();
  } catch (cause) {
    console.error("[panel] no se pudo crear el camarero", { cause });
    return fail("No se pudo crear el camarero. Probá de nuevo.");
  }
}

export async function updateWaiter(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  const id = readInt(formData.get("id"));
  const name = readString(formData.get("name"));

  if (!id) return fail("Falta el identificador del camarero.");
  const errorNombre = validateName(name);
  if (errorNombre) return fail(errorNombre);

  try {
    const actual = await getWaiterForAccount(id, user.accountId);
    if (!actual) return fail("El camarero ya no existe.");

    await db.update(waiters).set({ name }).where(eq(waiters.id, id));

    revalidarPanel();
    return ok();
  } catch (cause) {
    console.error("[panel] no se pudo actualizar el camarero", { id, cause });
    return fail("No se pudo guardar el camarero.");
  }
}

export async function toggleWaiter(
  id: number,
  active: boolean
): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  try {
    const actual = await getWaiterForAccount(id, user.accountId);
    if (!actual) return fail("El camarero ya no existe.");

    await db.update(waiters).set({ active }).where(eq(waiters.id, id));

    revalidarPanel();
    return ok();
  } catch (cause) {
    console.error("[panel] no se pudo cambiar el estado del camarero", { id, cause });
    return fail("No se pudo cambiar el estado del camarero.");
  }
}

/* ── Asignar pulsera a camarero ──────────────────────────────────────────── */

/**
 * Cambia (o quita) el camarero de una pulsera.
 *
 * Los escaneos ya registrados no se tocan: quedan atribuidos a quien tenía la
 * pulsera en ese momento. Es lo correcto para un ranking mensual — si no, al
 * reasignar una pulsera se reescribiría la historia del mes.
 */
export async function assignWaiter(
  braceletId: number,
  waiterId: number | null
): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  try {
    const pulsera = await getBraceletForAccount(braceletId, user.accountId);
    if (!pulsera) return fail("La pulsera ya no existe.");

    if (waiterId !== null) {
      const camarero = await getWaiterForAccount(waiterId, user.accountId);
      if (!camarero) return fail("El camarero elegido no existe.");
      // Un camarero solo puede tener pulseras de su propio local.
      if (camarero.locationId !== pulsera.locationId) {
        return fail("Ese camarero pertenece a otro local.");
      }
    }

    await db
      .update(bracelets)
      .set({ waiterId })
      .where(eq(bracelets.id, braceletId));

    invalidateBracelet(pulsera.code);
    revalidarPanel();
    return ok();
  } catch (cause) {
    console.error("[panel] no se pudo asignar el camarero", { braceletId, cause });
    return fail("No se pudo asignar el camarero.");
  }
}

/* ── Página pública del local ────────────────────────────────────────────── */

export async function updateLanding(formData: FormData): Promise<ActionResult> {
  const user = await requireRestaurantUser();

  const locationId = readInt(formData.get("locationId"));
  if (!locationId) return fail("Falta el identificador del local.");

  const displayName = readString(formData.get("displayName"));
  const tagline = readString(formData.get("tagline"));
  const address = readString(formData.get("address"));
  const whatsappPhone = readString(formData.get("whatsappPhone"));

  // Cada URL se valida por separado para poder decir cuál está mal.
  const campos: { key: string; label: string; value: string }[] = [
    { key: "logoUrl", label: "El logo", value: readString(formData.get("logoUrl")) },
    {
      key: "googleReviewUrl",
      label: "El enlace de Google Reviews",
      value: readString(formData.get("googleReviewUrl")),
    },
    {
      key: "instagramUrl",
      label: "El Instagram",
      value: readString(formData.get("instagramUrl")),
    },
    {
      key: "websiteUrl",
      label: "El sitio web",
      value: readString(formData.get("websiteUrl")),
    },
    { key: "menuUrl", label: "El menú", value: readString(formData.get("menuUrl")) },
    {
      key: "mapsUrl",
      label: "El enlace de Maps",
      value: readString(formData.get("mapsUrl")),
    },
  ];

  for (const campo of campos) {
    const error = validateOptionalUrl(campo.value, campo.label);
    if (error) return fail(error);
  }

  if (whatsappPhone !== "") {
    const errorTelefono = validatePhone(whatsappPhone);
    if (errorTelefono) return fail(errorTelefono);
  }

  if (displayName !== "" && displayName.length > 255) {
    return fail("El nombre visible no puede superar los 255 caracteres.");
  }

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local ya no existe.");

    const vacioANull = (valor: string) => (valor === "" ? null : valor);
    const porClave = Object.fromEntries(
      campos.map((campo) => [campo.key, vacioANull(campo.value)])
    );

    await db
      .update(locations)
      .set({
        displayName: vacioANull(displayName),
        tagline: vacioANull(tagline),
        address: vacioANull(address),
        whatsappPhone: vacioANull(whatsappPhone.replace(/\D/g, "")),
        logoUrl: porClave.logoUrl,
        googleReviewUrl: porClave.googleReviewUrl,
        instagramUrl: porClave.instagramUrl,
        websiteUrl: porClave.websiteUrl,
        menuUrl: porClave.menuUrl,
        mapsUrl: porClave.mapsUrl,
      })
      .where(eq(locations.id, locationId));

    // El caché de la landing guarda estos datos: hay que invalidar todas las
    // pulseras del local o el cambio tardaría hasta que venza el TTL.
    const codigos = await getBraceletCodesOfLocation(locationId);
    for (const code of codigos) invalidateBracelet(code);

    revalidarPanel();
    return ok();
  } catch (cause) {
    console.error("[panel] no se pudo actualizar la página del local", {
      locationId,
      cause,
    });
    return fail("No se pudo guardar. Probá de nuevo.");
  }
}
