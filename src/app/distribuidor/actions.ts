"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { bracelets, db } from "@/db";
import { getBraceletForDistributor } from "@/db/queries/bracelets";
import { getLocationById } from "@/db/queries/locations";
import { listAccountIdsOfDistributor } from "@/db/queries/accounts";
import { altaDeRestaurante } from "@/lib/alta-restaurante";
import { invalidateBracelet } from "@/lib/redirect-cache";
import { requireDistributor } from "@/lib/session";
import {
  fail,
  ok,
  readInt,
  readString,
  type ActionResult,
} from "@/lib/validation";

/**
 * Acciones del panel del distribuidor.
 *
 * Todas empiezan con `requireDistributor()` y, además, vuelven a verificar que
 * lo que se está tocando sea suyo. Lo primero lo garantiza el rol; lo segundo
 * es lo que impide que un distribuidor toque las cuentas o las pulseras de
 * otro mandando un id a mano.
 */

function revalidar() {
  revalidatePath("/distribuidor");
  revalidatePath("/distribuidor/restaurantes");
  revalidatePath("/distribuidor/pulseras");
}

/* ── Alta de restaurante ──────────────────────────────────────────────────── */

/**
 * Crea la cuenta, su primer local y el usuario que entra al panel, todo
 * asociado a este distribuidor.
 */
export async function crearRestaurante(
  formData: FormData
): Promise<ActionResult> {
  const distribuidor = await requireDistributor();

  const resultado = await altaDeRestaurante({
    nombre: readString(formData.get("nombre")),
    email: readString(formData.get("email")),
    password: readString(formData.get("password")),
    nombreUsuario: readString(formData.get("nombreUsuario")),
    googleReviewUrl: readString(formData.get("googleReviewUrl")),
    // Sale de la sesión, no del formulario: un distribuidor no puede dar de
    // alta un restaurante a nombre de otro.
    distributorId: distribuidor.id,
  });

  if (!resultado.ok) return resultado;

  revalidar();
  return ok();
}

/* ── Colocar una pulsera ──────────────────────────────────────────────────── */

/**
 * Pone una pulsera del stock del distribuidor en uno de sus locales, o la
 * devuelve al stock.
 *
 * El distribuidor no crea códigos: los códigos existen porque Toqia grabó los
 * chips y se los entregó. Lo único que decide acá es dónde va cada uno.
 */
export async function colocarPulsera(
  formData: FormData
): Promise<ActionResult> {
  const distribuidor = await requireDistributor();

  const braceletId = readInt(formData.get("braceletId"));
  const destino = readString(formData.get("locationId"));

  if (!braceletId) return fail("Falta el identificador de la pulsera.");

  try {
    const pulsera = await getBraceletForDistributor(braceletId, distribuidor.id);
    if (!pulsera) return fail("Esa pulsera no es tuya.");

    // Volver al stock: se saca del local y se le quita el camarero, que era
    // del salón del que acaba de salir.
    if (destino === "") {
      await db
        .update(bracelets)
        .set({ locationId: null, waiterId: null })
        .where(eq(bracelets.id, braceletId));

      invalidateBracelet(pulsera.code);
      revalidar();
      return ok();
    }

    const locationId = Number.parseInt(destino, 10);
    if (!Number.isFinite(locationId) || locationId <= 0) {
      return fail("El local elegido no es válido.");
    }

    const local = await getLocationById(locationId);
    if (!local) return fail("El local elegido no existe.");

    // La comprobación que importa: el local tiene que ser de una cuenta de
    // este distribuidor. Sin esto, cambiar el número del formulario alcanzaría
    // para meter una pulsera en el restaurante de otro.
    const cuentas = await listAccountIdsOfDistributor(distribuidor.id);
    if (!cuentas.includes(local.accountId)) {
      return fail("Ese local no es de ninguno de tus restaurantes.");
    }

    await db
      .update(bracelets)
      .set({ locationId, waiterId: null })
      .where(eq(bracelets.id, braceletId));

    invalidateBracelet(pulsera.code);
    revalidar();
    return ok();
  } catch (cause) {
    console.error("[distribuidor] no se pudo colocar la pulsera", {
      braceletId,
      cause,
    });
    return fail("No se pudo mover la pulsera.");
  }
}
