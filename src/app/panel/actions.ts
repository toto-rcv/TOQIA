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
import {
  ErrorDeArchivo,
  resolverCampoDeArchivo,
} from "@/lib/media";
import { invalidateBracelet } from "@/lib/redirect-cache";
import { mensajeDeError } from "@/lib/errores-db";
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
    return fail(mensajeDeError("No se pudo crear el camarero", cause));
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
    return fail(mensajeDeError("No se pudo guardar el camarero", cause));
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
    return fail(mensajeDeError("No se pudo cambiar el estado del camarero", cause));
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
    return fail(mensajeDeError("No se pudo asignar el camarero", cause));
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
  const phone = readString(formData.get("phone"));
  const welcomeKicker = readString(formData.get("welcomeKicker"));
  const welcomeTitle = readString(formData.get("welcomeTitle"));
  const closingMessage = readString(formData.get("closingMessage"));
  const currency = readString(formData.get("currency")) || "€";

  // Qué carta se muestra. Cualquier cosa que no sea "pdf" cae en "toqia":
  // es el valor seguro, el que no depende de un archivo que puede faltar.
  const menuMode = readString(formData.get("menuMode")) === "pdf" ? "pdf" : "toqia";

  // Enlaces que el local escribe a mano. Las imágenes y el PDF ya no son
  // campos de texto: se suben y se guardan en la base (ver más abajo).
  const campos: { key: string; label: string; value: string }[] = [
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
    {
      key: "mapsUrl",
      label: "El enlace de Maps",
      value: readString(formData.get("mapsUrl")),
    },
    {
      key: "reservationUrl",
      label: "El enlace de reservas",
      value: readString(formData.get("reservationUrl")),
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

  if (phone !== "" && phone.replace(/\D/g, "").length < 6) {
    return fail("El teléfono de contacto es demasiado corto.");
  }

  if (currency.length > 8) {
    return fail("El símbolo de moneda no puede superar los 8 caracteres.");
  }

  // Cada texto libre tiene su propio tope en la base. Sin validarlos acá,
  // pasarse por un carácter llegaba hasta MySQL y volvía como un
  // "no se pudo guardar" que no decía qué campo achicar.
  const TOPES: Array<[string, string, number]> = [
    [displayName, "El nombre visible", 255],
    [tagline, "La frase", 255],
    [address, "La dirección", 500],
    [phone, "El teléfono", 32],
    [welcomeKicker, "El texto de bienvenida", 120],
    [welcomeTitle, "El título de la reseña", 200],
    [closingMessage, "El mensaje de cierre", 200],
  ];

  for (const [valor, etiqueta, tope] of TOPES) {
    if (valor.length > tope) {
      return fail(
        `${etiqueta} no puede superar los ${tope} caracteres (tiene ${valor.length}).`
      );
    }
  }

  try {
    const local = await getLocationForAccount(locationId, user.accountId);
    if (!local) return fail("El local ya no existe.");

    const vacioANull = (valor: string) => (valor === "" ? null : valor);
    const porClave = Object.fromEntries(
      campos.map((campo) => [campo.key, vacioANull(campo.value)])
    );

    // Archivos. Cada uno resuelve a: la URL nueva si subieron algo, null si
    // apretaron "Quitar", o lo que ya había si no tocaron el campo. El
    // archivo anterior se borra solo, sin dejar basura en la base.
    const archivos = await Promise.all([
      resolverCampoDeArchivo({
        file: formData.get("logoFile"),
        quitar: formData.get("logoRemove") === "1",
        actual: local.logoUrl,
        locationId,
        kind: "logo",
        formato: "imagen",
        etiqueta: "El logo",
      }),
      resolverCampoDeArchivo({
        file: formData.get("coverFile"),
        quitar: formData.get("coverRemove") === "1",
        actual: local.coverImageUrl,
        locationId,
        kind: "cover",
        formato: "imagen",
        etiqueta: "La foto de portada",
      }),
      resolverCampoDeArchivo({
        file: formData.get("closingFile"),
        quitar: formData.get("closingRemove") === "1",
        actual: local.closingImageUrl,
        locationId,
        kind: "closing",
        formato: "imagen",
        etiqueta: "La foto de cierre",
      }),
      resolverCampoDeArchivo({
        file: formData.get("menuFile"),
        quitar: formData.get("menuRemove") === "1",
        actual: local.menuUrl,
        locationId,
        kind: "menu_pdf",
        formato: "pdf",
        etiqueta: "La carta en PDF",
      }),
    ]);

    const [logoUrl, coverImageUrl, closingImageUrl, menuUrl] = archivos;

    await db
      .update(locations)
      .set({
        displayName: vacioANull(displayName),
        tagline: vacioANull(tagline),
        address: vacioANull(address),
        whatsappPhone: vacioANull(whatsappPhone.replace(/\D/g, "")),
        phone: vacioANull(phone),
        welcomeKicker: vacioANull(welcomeKicker),
        welcomeTitle: vacioANull(welcomeTitle),
        closingMessage: vacioANull(closingMessage),
        currency,
        menuMode,
        googleReviewUrl: porClave.googleReviewUrl,
        instagramUrl: porClave.instagramUrl,
        websiteUrl: porClave.websiteUrl,
        mapsUrl: porClave.mapsUrl,
        reservationUrl: porClave.reservationUrl,
        logoUrl,
        coverImageUrl,
        closingImageUrl,
        menuUrl,
      })
      .where(eq(locations.id, locationId));

    // El caché de la landing guarda estos datos: hay que invalidar todas las
    // pulseras del local o el cambio tardaría hasta que venza el TTL.
    const codigos = await getBraceletCodesOfLocation(locationId);
    for (const code of codigos) invalidateBracelet(code);

    revalidarPanel();
    return ok();
  } catch (cause) {
    // Los errores de archivo ya traen un mensaje pensado para el usuario
    // ("pesa 8 MB y el máximo es 6 MB"): no tiene sentido taparlos con un
    // genérico.
    if (cause instanceof ErrorDeArchivo) return fail(cause.message);

    console.error("[panel] no se pudo actualizar la página del local", {
      locationId,
      cause,
    });
    return fail(mensajeDeError("No se pudo guardar", cause));
  }
}
