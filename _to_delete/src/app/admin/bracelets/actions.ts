"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { bracelets, db } from "@/db";
import {
  findExistingCodes,
  getBraceletById,
  getBraceletByCode,
} from "@/db/queries/bracelets";
import { getRestaurantById } from "@/db/queries/restaurants";
import { invalidateBracelet } from "@/lib/redirect-cache";
import { requireSession } from "@/lib/session";
import {
  fail,
  ok,
  readInt,
  readString,
  validateCode,
  validateDestinationUrl,
  type ActionResult,
} from "@/lib/validation";

/**
 * Todas las mutaciones de pulseras.
 *
 * Dos reglas que se repiten en cada action:
 *  1. `requireSession()` primero. El layout de /admin no protege un POST
 *     directo contra una Server Action.
 *  2. Después de tocar una pulsera, `invalidateBracelet(code)` para que el
 *     endpoint /r/[code] use el valor nuevo sin esperar a que venza el TTL.
 */

function revalidateBraceletViews() {
  revalidatePath("/admin/bracelets");
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
}

/** Detecta el error de clave duplicada de MySQL sin acoplarse al texto. */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

/* ── La función central: cambiar el destino ──────────────────────────────── */

export async function updateDestination(
  braceletId: number,
  destinationUrl: string
): Promise<ActionResult> {
  await requireSession();

  const error = validateDestinationUrl(destinationUrl);
  if (error) return fail(error);

  try {
    const bracelet = await getBraceletById(braceletId);
    if (!bracelet) return fail("La pulsera ya no existe.");

    await db
      .update(bracelets)
      .set({ destinationUrl: destinationUrl.trim() })
      .where(eq(bracelets.id, braceletId));

    // Sin esto el cambio tardaría hasta 60 segundos en verse.
    invalidateBracelet(bracelet.code);
    revalidateBraceletViews();

    return ok();
  } catch (cause) {
    console.error("[bracelets] no se pudo actualizar el destino", {
      braceletId,
      cause,
    });
    return fail("No se pudo guardar el destino. Probá de nuevo.");
  }
}

/* ── Alta individual ─────────────────────────────────────────────────────── */

export async function createBracelet(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const code = readString(formData.get("code"));
  const restaurantId = readInt(formData.get("restaurantId"));
  const destinationUrl = readString(formData.get("destinationUrl"));
  const label = readString(formData.get("label"));

  const codeError = validateCode(code);
  if (codeError) return fail(codeError);

  if (!restaurantId) return fail("Elegí un restaurante.");

  const destinationError = validateDestinationUrl(destinationUrl);
  if (destinationError) return fail(destinationError);

  try {
    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) return fail("El restaurante elegido no existe.");

    const existing = await getBraceletByCode(code);
    if (existing) return fail(`Ya existe una pulsera con el código ${code}.`);

    await db.insert(bracelets).values({
      code,
      restaurantId,
      destinationUrl,
      label: label === "" ? null : label.slice(0, 255),
      active: true,
    });

    invalidateBracelet(code);
    revalidateBraceletViews();
    return ok();
  } catch (cause) {
    if (isDuplicateKeyError(cause)) {
      // Carrera: alguien creó el mismo código entre el chequeo y el insert.
      return fail(`Ya existe una pulsera con el código ${code}.`);
    }
    console.error("[bracelets] no se pudo crear la pulsera", { code, cause });
    return fail("No se pudo crear la pulsera. Probá de nuevo.");
  }
}

/* ── Alta masiva ─────────────────────────────────────────────────────────── */

export type BulkResult = { created: number; skipped: string[] };

/**
 * Genera N pulseras con prefijo y numeración correlativa (B001, B002, …).
 *
 * Los códigos que ya existen se saltean en vez de abortar el lote entero:
 * es lo que uno quiere cuando se está ampliando una tanda existente.
 */
export async function createBraceletsBulk(
  formData: FormData
): Promise<ActionResult<BulkResult>> {
  await requireSession();

  const restaurantId = readInt(formData.get("restaurantId"));
  const prefix = readString(formData.get("prefix"));
  const start = readInt(formData.get("start")) ?? 1;
  const count = readInt(formData.get("count"));
  const padding = readInt(formData.get("padding")) ?? 3;
  const destinationUrl = readString(formData.get("destinationUrl"));

  if (!restaurantId) return fail("Elegí un restaurante.");
  if (prefix === "") return fail("Poné un prefijo (por ejemplo, B).");
  if (!/^[A-Za-z0-9._-]{1,20}$/.test(prefix)) {
    return fail("El prefijo solo admite letras, números, punto, guion y guion bajo.");
  }
  if (!count || count < 1) return fail("La cantidad tiene que ser al menos 1.");
  if (count > 500) return fail("Máximo 500 pulseras por lote.");
  if (start < 0) return fail("El número inicial no puede ser negativo.");
  if (padding < 0 || padding > 10) return fail("El relleno tiene que estar entre 0 y 10.");

  const destinationError = validateDestinationUrl(destinationUrl);
  if (destinationError) return fail(destinationError);

  // Armamos la lista de códigos y validamos que ninguno se pase de largo.
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const numero = String(start + i).padStart(padding, "0");
    const code = `${prefix}${numero}`;
    if (code.length > 50) {
      return fail(`El código generado "${code}" supera los 50 caracteres.`);
    }
    codes.push(code);
  }

  try {
    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) return fail("El restaurante elegido no existe.");

    const existing = await findExistingCodes(codes);
    const nuevos = codes.filter((code) => !existing.has(code));

    if (nuevos.length === 0) {
      return fail("Todos los códigos de ese rango ya existen.");
    }

    await db.insert(bracelets).values(
      nuevos.map((code) => ({
        code,
        restaurantId,
        destinationUrl,
        label: null,
        active: true,
      }))
    );

    for (const code of nuevos) invalidateBracelet(code);
    revalidateBraceletViews();

    return ok<BulkResult>({
      created: nuevos.length,
      skipped: [...existing],
    });
  } catch (cause) {
    console.error("[bracelets] fallo el alta masiva", { prefix, count, cause });
    return fail("No se pudo generar el lote. Probá de nuevo.");
  }
}

/* ── Edición y estado ────────────────────────────────────────────────────── */

export async function updateBracelet(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const id = readInt(formData.get("id"));
  const code = readString(formData.get("code"));
  const label = readString(formData.get("label"));
  const destinationUrl = readString(formData.get("destinationUrl"));
  const restaurantId = readInt(formData.get("restaurantId"));

  if (!id) return fail("Falta el identificador de la pulsera.");

  const codeError = validateCode(code);
  if (codeError) return fail(codeError);

  const destinationError = validateDestinationUrl(destinationUrl);
  if (destinationError) return fail(destinationError);

  if (!restaurantId) return fail("Elegí un restaurante.");

  try {
    const current = await getBraceletById(id);
    if (!current) return fail("La pulsera ya no existe.");

    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) return fail("El restaurante elegido no existe.");

    await db
      .update(bracelets)
      .set({
        code,
        label: label === "" ? null : label.slice(0, 255),
        destinationUrl,
        restaurantId,
      })
      .where(eq(bracelets.id, id));

    // Si cambió el código hay que invalidar los dos: el viejo deja de existir.
    invalidateBracelet(current.code);
    invalidateBracelet(code);
    revalidateBraceletViews();

    return ok();
  } catch (cause) {
    if (isDuplicateKeyError(cause)) {
      return fail(`Ya existe otra pulsera con el código ${code}.`);
    }
    console.error("[bracelets] no se pudo actualizar la pulsera", { id, cause });
    return fail("No se pudo guardar la pulsera. Probá de nuevo.");
  }
}

export async function toggleBracelet(
  braceletId: number,
  active: boolean
): Promise<ActionResult> {
  await requireSession();

  try {
    const bracelet = await getBraceletById(braceletId);
    if (!bracelet) return fail("La pulsera ya no existe.");

    await db.update(bracelets).set({ active }).where(eq(bracelets.id, braceletId));

    invalidateBracelet(bracelet.code);
    revalidateBraceletViews();
    return ok();
  } catch (cause) {
    console.error("[bracelets] no se pudo cambiar el estado", { braceletId, cause });
    return fail("No se pudo cambiar el estado de la pulsera.");
  }
}
