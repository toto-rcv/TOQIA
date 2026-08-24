"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  account as authAccount,
  accounts,
  bracelets,
  db,
  locations,
  user,
  waiters,
} from "@/db";
import {
  getAccountById,
  getAccountBySlug,
  getBraceletCodesOfAccount,
  getDistributorById,
} from "@/db/queries/accounts";
import { getBraceletByCode, getBraceletById, findExistingCodes } from "@/db/queries/bracelets";
import {
  getBraceletCodesOfLocation,
  getLocationById,
  getLocationBySlug,
} from "@/db/queries/locations";
import { auth } from "@/lib/auth";
import { invalidateAll, invalidateBracelet } from "@/lib/redirect-cache";
import { mensajeDeError } from "@/lib/errores-db";
import { requireAdmin } from "@/lib/session";
import {
  fail,
  ok,
  readInt,
  readString,
  slugify,
  validateCode,
  validateEmail,
  validateName,
  validateOptionalUrl,
  validatePassword,
  validateSlug,
  validateSubscriptionStatus,
  type ActionResult,
} from "@/lib/validation";

/**
 * Acciones del panel de administración.
 *
 * Todas empiezan con `requireAdmin()`: el layout protege las páginas, pero no
 * protege un POST directo contra una Server Action.
 */

function revalidarAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/cuentas");
  revalidatePath("/admin/locales");
  revalidatePath("/admin/pulseras");
  revalidatePath("/admin/camareros");
}

function esClaveDuplicada(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

/* ── Cuentas ─────────────────────────────────────────────────────────────── */

export async function createAccount(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug")) || slugify(name);

  const errorNombre = validateName(name);
  if (errorNombre) return fail(errorNombre);

  const errorSlug = validateSlug(slug);
  if (errorSlug) return fail(errorSlug);

  try {
    if (await getAccountBySlug(slug)) {
      return fail(`Ya existe una cuenta con el slug "${slug}".`);
    }

    await db.insert(accounts).values({ name, slug, active: true });

    revalidarAdmin();
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) {
      return fail(`Ya existe una cuenta con el slug "${slug}".`);
    }
    console.error("[admin] no se pudo crear la cuenta", { slug, cause });
    return fail(mensajeDeError("No se pudo crear la cuenta", cause));
  }
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = readInt(formData.get("id"));
  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug"));
  const subscriptionStatus = readString(formData.get("subscriptionStatus"));
  const subscriptionPrice = readString(formData.get("subscriptionPrice"));
  const subscriptionExpiresAt = readString(formData.get("subscriptionExpiresAt"));
  const distributorId = readString(formData.get("distributorId"));

  if (!id) return fail("Falta el identificador de la cuenta.");

  const errorNombre = validateName(name);
  if (errorNombre) return fail(errorNombre);

  const errorSlug = validateSlug(slug);
  if (errorSlug) return fail(errorSlug);

  const errorEstado = validateSubscriptionStatus(subscriptionStatus);
  if (errorEstado) return fail(errorEstado);

  let precio: string | null = null;
  if (subscriptionPrice !== "") {
    const numero = Number(subscriptionPrice.replace(",", "."));
    if (!Number.isFinite(numero) || numero < 0) {
      return fail("El precio tiene que ser un número positivo.");
    }
    precio = numero.toFixed(2);
  }

  let vence: Date | null = null;
  if (subscriptionExpiresAt !== "") {
    const fecha = new Date(`${subscriptionExpiresAt}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return fail("La fecha de vencimiento no es válida.");
    vence = fecha;
  }

  try {
    const actual = await getAccountById(id);
    if (!actual) return fail("La cuenta ya no existe.");

    await db
      .update(accounts)
      .set({
        name,
        slug,
        subscriptionStatus: subscriptionStatus as "trial",
        subscriptionPrice: precio,
        subscriptionExpiresAt: vence,
        distributorId: distributorId === "" ? null : distributorId,
      })
      .where(eq(accounts.id, id));

    // Cambiar el estado de suscripción puede habilitar o cortar todas las
    // pulseras de la cuenta, así que el caché de la landing queda viejo.
    const codigos = await getBraceletCodesOfAccount(id);
    for (const code of codigos) invalidateBracelet(code);

    revalidarAdmin();
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) return fail(`Ya existe otra cuenta con el slug "${slug}".`);
    console.error("[admin] no se pudo actualizar la cuenta", { id, cause });
    return fail(mensajeDeError("No se pudo guardar la cuenta", cause));
  }
}

/**
 * Dar de baja una cuenta corta la redirección de TODAS sus pulseras, sin
 * importar el estado de cada local o pulsera.
 */
export async function toggleAccount(
  id: number,
  active: boolean
): Promise<ActionResult> {
  await requireAdmin();

  try {
    const actual = await getAccountById(id);
    if (!actual) return fail("La cuenta ya no existe.");

    await db.update(accounts).set({ active }).where(eq(accounts.id, id));

    const codigos = await getBraceletCodesOfAccount(id);
    for (const code of codigos) invalidateBracelet(code);

    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo cambiar el estado de la cuenta", { id, cause });
    return fail(mensajeDeError("No se pudo cambiar el estado de la cuenta", cause));
  }
}

/* ── Locales ─────────────────────────────────────────────────────────────── */

export async function createLocation(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const accountId = readInt(formData.get("accountId"));
  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug")) || slugify(name);
  const googleReviewUrl = readString(formData.get("googleReviewUrl"));

  if (!accountId) return fail("Elegí una cuenta.");

  const errorNombre = validateName(name);
  if (errorNombre) return fail(errorNombre);

  const errorSlug = validateSlug(slug);
  if (errorSlug) return fail(errorSlug);

  const errorUrl = validateOptionalUrl(googleReviewUrl, "El enlace de Google Reviews");
  if (errorUrl) return fail(errorUrl);

  try {
    if (!(await getAccountById(accountId))) return fail("La cuenta elegida no existe.");
    if (await getLocationBySlug(slug)) {
      return fail(`Ya existe un local con el slug "${slug}".`);
    }

    await db.insert(locations).values({
      accountId,
      name,
      slug,
      googleReviewUrl: googleReviewUrl === "" ? null : googleReviewUrl,
      active: true,
    });

    revalidarAdmin();
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) return fail(`Ya existe un local con el slug "${slug}".`);
    console.error("[admin] no se pudo crear el local", { slug, cause });
    return fail(mensajeDeError("No se pudo crear el local", cause));
  }
}

export async function updateLocation(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = readInt(formData.get("id"));
  const accountId = readInt(formData.get("accountId"));
  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug"));

  if (!id) return fail("Falta el identificador del local.");
  if (!accountId) return fail("Elegí una cuenta.");

  const errorNombre = validateName(name);
  if (errorNombre) return fail(errorNombre);

  const errorSlug = validateSlug(slug);
  if (errorSlug) return fail(errorSlug);

  try {
    if (!(await getLocationById(id))) return fail("El local ya no existe.");
    if (!(await getAccountById(accountId))) return fail("La cuenta elegida no existe.");

    await db.update(locations).set({ name, slug, accountId }).where(eq(locations.id, id));

    const codigos = await getBraceletCodesOfLocation(id);
    for (const code of codigos) invalidateBracelet(code);

    revalidarAdmin();
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) return fail(`Ya existe otro local con el slug "${slug}".`);
    console.error("[admin] no se pudo actualizar el local", { id, cause });
    return fail(mensajeDeError("No se pudo guardar el local", cause));
  }
}

export async function toggleLocation(
  id: number,
  active: boolean
): Promise<ActionResult> {
  await requireAdmin();

  try {
    if (!(await getLocationById(id))) return fail("El local ya no existe.");

    await db.update(locations).set({ active }).where(eq(locations.id, id));

    const codigos = await getBraceletCodesOfLocation(id);
    for (const code of codigos) invalidateBracelet(code);

    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo cambiar el estado del local", { id, cause });
    return fail(mensajeDeError("No se pudo cambiar el estado del local", cause));
  }
}

/* ── Pulseras ────────────────────────────────────────────────────────────── */

/* ── Destino de una pulsera ──────────────────────────────────────────────── */

/**
 * Dónde está una pulsera: en un local, en el stock de un distribuidor, o en el
 * stock de Toqia sin asignar.
 *
 * Viaja en un solo campo del formulario con el formato `local:12` /
 * `distribuidor:<uuid>` / `stock`. Un solo desplegable en vez de dos campos
 * excluyentes evita el estado imposible de "un local y un distribuidor a la
 * vez", que después habría que validar en todos lados.
 */
type Destino = { locationId: number | null; distributorId: string | null };

async function leerDestino(
  formData: FormData
): Promise<ActionResult<Destino>> {
  const raw = readString(formData.get("destino"));

  if (raw === "" || raw === "stock") {
    return ok<Destino>({ locationId: null, distributorId: null });
  }

  if (raw.startsWith("local:")) {
    const locationId = Number.parseInt(raw.slice("local:".length), 10);
    if (!Number.isFinite(locationId) || locationId <= 0) {
      return fail("El destino elegido no es válido.");
    }
    if (!(await getLocationById(locationId))) {
      return fail("El local elegido no existe.");
    }
    return ok<Destino>({ locationId, distributorId: null });
  }

  if (raw.startsWith("distribuidor:")) {
    const distributorId = raw.slice("distribuidor:".length);
    if (!(await getDistributorById(distributorId))) {
      return fail("El distribuidor elegido no existe.");
    }
    return ok<Destino>({ locationId: null, distributorId });
  }

  return fail("El destino elegido no es válido.");
}

export async function createBracelet(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const code = readString(formData.get("code"));
  const label = readString(formData.get("label"));
  const overrideUrl = readString(formData.get("overrideUrl"));
  const deviceType = readString(formData.get("deviceType")) || "pulsera";

  const errorCodigo = validateCode(code);
  if (errorCodigo) return fail(errorCodigo);
  if (deviceType !== "pulsera" && deviceType !== "placa") {
    return fail("El tipo de dispositivo no es válido.");
  }

  const errorUrl = validateOptionalUrl(overrideUrl, "El destino directo");
  if (errorUrl) return fail(errorUrl);

  const destino = await leerDestino(formData);
  if (!destino.ok) return destino;

  try {
    if (await getBraceletByCode(code)) {
      return fail(`Ya existe una pulsera con el código ${code}.`);
    }

    await db.insert(bracelets).values({
      code,
      locationId: destino.data!.locationId,
      distributorId: destino.data!.distributorId,
      deviceType: deviceType as "pulsera" | "placa",
      label: label === "" ? null : label.slice(0, 255),
      overrideUrl: overrideUrl === "" ? null : overrideUrl,
      active: true,
    });

    invalidateBracelet(code);
    revalidarAdmin();
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) return fail(`Ya existe una pulsera con el código ${code}.`);
    console.error("[admin] no se pudo crear la pulsera", { code, cause });
    return fail(mensajeDeError("No se pudo crear la pulsera", cause));
  }
}

export type BulkResult = { created: number; skipped: string[] };

/**
 * Genera N pulseras con prefijo y numeración correlativa (B001, B002, …).
 * Los códigos que ya existen se saltean en vez de abortar el lote entero: es
 * lo que uno quiere cuando amplía una tanda existente.
 */
export async function createBraceletsBulk(
  formData: FormData
): Promise<ActionResult<BulkResult>> {
  await requireAdmin();

  const prefix = readString(formData.get("prefix"));
  const start = readInt(formData.get("start")) ?? 1;
  const count = readInt(formData.get("count"));
  const padding = readInt(formData.get("padding")) ?? 3;
  const deviceType = readString(formData.get("deviceType")) || "pulsera";

  if (deviceType !== "pulsera" && deviceType !== "placa") {
    return fail("El tipo de dispositivo no es válido.");
  }
  if (prefix === "") return fail("Poné un prefijo (por ejemplo, B).");
  if (!/^[A-Za-z0-9._-]{1,20}$/.test(prefix)) {
    return fail("El prefijo solo admite letras, números, punto, guion y guion bajo.");
  }
  if (!count || count < 1) return fail("La cantidad tiene que ser al menos 1.");
  if (count > 500) return fail("Máximo 500 pulseras por lote.");
  if (start < 0) return fail("El número inicial no puede ser negativo.");
  if (padding < 0 || padding > 10) return fail("El relleno tiene que estar entre 0 y 10.");

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const numero = String(start + i).padStart(padding, "0");
    const code = `${prefix}${numero}`;
    if (code.length > 50) {
      return fail(`El código generado "${code}" supera los 50 caracteres.`);
    }
    codes.push(code);
  }

  const destino = await leerDestino(formData);
  if (!destino.ok) return destino;

  try {
    const existentes = await findExistingCodes(codes);
    const nuevos = codes.filter((code) => !existentes.has(code));

    if (nuevos.length === 0) return fail("Todos los códigos de ese rango ya existen.");

    await db.insert(bracelets).values(
      nuevos.map((code) => ({
        code,
        locationId: destino.data!.locationId,
        distributorId: destino.data!.distributorId,
        // El valor ya se validó contra la lista permitida más arriba; el
        // estrechamiento explícito es solo para el tipo de la columna enum.
        deviceType: deviceType as "pulsera" | "placa",
        active: true,
      }))
    );

    for (const code of nuevos) invalidateBracelet(code);
    revalidarAdmin();

    return ok<BulkResult>({ created: nuevos.length, skipped: [...existentes] });
  } catch (cause) {
    console.error("[admin] falló el alta masiva", { prefix, count, cause });
    return fail(mensajeDeError("No se pudo generar el lote", cause));
  }
}

export async function updateBracelet(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = readInt(formData.get("id"));
  const code = readString(formData.get("code"));
  const waiterId = readInt(formData.get("waiterId"));
  const label = readString(formData.get("label"));
  const overrideUrl = readString(formData.get("overrideUrl"));
  const deviceType = readString(formData.get("deviceType")) || "pulsera";

  if (!id) return fail("Falta el identificador de la pulsera.");
  if (deviceType !== "pulsera" && deviceType !== "placa") {
    return fail("El tipo de dispositivo no es válido.");
  }

  const errorCodigo = validateCode(code);
  if (errorCodigo) return fail(errorCodigo);

  const errorUrl = validateOptionalUrl(overrideUrl, "El destino directo");
  if (errorUrl) return fail(errorUrl);

  const destino = await leerDestino(formData);
  if (!destino.ok) return destino;
  const { locationId, distributorId } = destino.data!;

  try {
    const actual = await getBraceletById(id);
    if (!actual) return fail("La pulsera ya no existe.");

    // El camarero tiene que ser del mismo local que la pulsera. Una pulsera
    // que vuelve al stock pierde el camarero: ya no está en ningún salón.
    if (waiterId && locationId === null) {
      return fail("Una pulsera sin local no puede tener camarero asignado.");
    }
    if (waiterId) {
      const filas = await db
        .select({ locationId: waiters.locationId })
        .from(waiters)
        .where(eq(waiters.id, waiterId))
        .limit(1);
      if (!filas[0]) return fail("El camarero elegido no existe.");
      if (filas[0].locationId !== locationId) {
        return fail("Ese camarero pertenece a otro local.");
      }
    }

    await db
      .update(bracelets)
      .set({
        code,
        locationId,
        distributorId,
        deviceType: deviceType as "pulsera" | "placa",
        waiterId: waiterId ?? null,
        label: label === "" ? null : label.slice(0, 255),
        overrideUrl: overrideUrl === "" ? null : overrideUrl,
      })
      .where(eq(bracelets.id, id));

    // Si cambió el código hay que invalidar los dos: el viejo deja de existir.
    invalidateBracelet(actual.code);
    invalidateBracelet(code);
    revalidarAdmin();

    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) return fail(`Ya existe otra pulsera con el código ${code}.`);
    console.error("[admin] no se pudo actualizar la pulsera", { id, cause });
    return fail(mensajeDeError("No se pudo guardar la pulsera", cause));
  }
}

export async function toggleBracelet(
  id: number,
  active: boolean
): Promise<ActionResult> {
  await requireAdmin();

  try {
    const actual = await getBraceletById(id);
    if (!actual) return fail("La pulsera ya no existe.");

    await db.update(bracelets).set({ active }).where(eq(bracelets.id, id));

    invalidateBracelet(actual.code);
    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo cambiar el estado de la pulsera", { id, cause });
    return fail(mensajeDeError("No se pudo cambiar el estado de la pulsera", cause));
  }
}

/* ── Usuarios ────────────────────────────────────────────────────────────── */

/**
 * Crea un usuario del panel.
 *
 * La contraseña se hashea con el propio Better Auth: si la escribiéramos con
 * otro algoritmo, el login fallaría sin decir por qué. El rol se setea después
 * del alta porque el endpoint de registro no acepta campos marcados como
 * `input: false`, que es justamente lo que impide que alguien se auto-asigne
 * permisos desde el cliente.
 */
export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = readString(formData.get("name"));
  const email = readString(formData.get("email")).toLowerCase();
  const password = readString(formData.get("password"));
  const role = readString(formData.get("role"));
  const accountId = readInt(formData.get("accountId"));

  const errorNombre = validateName(name);
  if (errorNombre) return fail(errorNombre);

  const errorEmail = validateEmail(email);
  if (errorEmail) return fail(errorEmail);

  const errorPassword = validatePassword(password);
  if (errorPassword) return fail(errorPassword);

  if (!["admin", "distributor", "restaurant"].includes(role)) {
    return fail("El rol no es válido.");
  }

  if (role === "restaurant" && !accountId) {
    return fail("Un usuario de restaurante necesita una cuenta asignada.");
  }

  try {
    if (accountId && !(await getAccountById(accountId))) {
      return fail("La cuenta elegida no existe.");
    }

    const existentes = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existentes[0]) return fail("Ya existe un usuario con ese email.");

    const ctx = await auth.$context;
    const passwordHash = await ctx.password.hash(password);

    const userId = randomUUID();
    const ahora = new Date();

    await db.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: role as "admin",
      accountId: role === "restaurant" ? accountId : null,
      createdAt: ahora,
      updatedAt: ahora,
    });

    await db.insert(authAccount).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: ahora,
      updatedAt: ahora,
    });

    revalidarAdmin();
    revalidatePath("/admin/usuarios");
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) return fail("Ya existe un usuario con ese email.");
    console.error("[admin] no se pudo crear el usuario", { email, cause });
    return fail(mensajeDeError("No se pudo crear el usuario", cause));
  }
}

/** Cambia la contraseña de un usuario del panel. */
export async function resetUserPassword(
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const userId = readString(formData.get("userId"));
  const password = readString(formData.get("password"));

  if (userId === "") return fail("Falta el identificador del usuario.");

  const errorPassword = validatePassword(password);
  if (errorPassword) return fail(errorPassword);

  try {
    const ctx = await auth.$context;
    const passwordHash = await ctx.password.hash(password);

    const filas = await db
      .select({ id: authAccount.id })
      .from(authAccount)
      .where(eq(authAccount.userId, userId))
      .limit(1);

    if (!filas[0]) return fail("Ese usuario no tiene credenciales cargadas.");

    await db
      .update(authAccount)
      .set({ password: passwordHash })
      .where(eq(authAccount.id, filas[0].id));

    revalidatePath("/admin/usuarios");
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo cambiar la contraseña", { userId, cause });
    return fail(mensajeDeError("No se pudo cambiar la contraseña", cause));
  }
}

/** Vacía el caché de la landing. Útil para diagnosticar. */
export async function clearLandingCache(): Promise<ActionResult> {
  await requireAdmin();
  invalidateAll();
  return ok();
}
