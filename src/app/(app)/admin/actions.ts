"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";

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
import { borrarCuentaEnCascada, borrarLocalEnCascada } from "@/lib/borrado-en-cascada";
import { invalidateAll, invalidateBracelet } from "@/lib/redirect-cache";
import { mensajeDeError } from "@/lib/errores-db";
import { COOKIE_CUENTA_ADMIN, requireAdmin } from "@/lib/session";
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
  type ErrorDeValidacion,
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

/**
 * El texto de un error de validación, en el idioma del pedido.
 *
 * Los validadores devuelven una clave y sus valores, no una frase ya escrita:
 * el panel está en siete idiomas y un mensaje armado dentro de
 * `lib/validation.ts` llegaría siempre en castellano al diálogo.
 */
async function textoDeError(error: ErrorDeValidacion): Promise<string> {
  const t = await getTranslations("Errores");
  return t(error.clave, error.valores);
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
  const t = await getTranslations("Errores");

  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug")) || slugify(name);
  const businessType = readString(formData.get("businessType"));

  const errorNombre = validateName(name);
  if (errorNombre) return fail(await textoDeError(errorNombre));

  const errorSlug = validateSlug(slug);
  if (errorSlug) return fail(await textoDeError(errorSlug));

  try {
    if (await getAccountBySlug(slug)) {
      return fail(t("cuentaConEseSlug", { slug }));
    }

    await db.insert(accounts).values({
      name,
      slug,
      // Vacío queda en null y no en cadena vacía: así "sin rubro cargado" es
      // un solo valor y el `??` del panel alcanza para decidir qué mostrar.
      businessType: businessType || null,
      active: true,
    });

    revalidarAdmin();
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) {
      return fail(t("cuentaConEseSlug", { slug }));
    }
    console.error("[admin] no se pudo crear la cuenta", { slug, cause });
    return fail(await mensajeDeError("noSePudoCrearCuenta", cause));
  }
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  const id = readInt(formData.get("id"));
  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug"));
  const businessType = readString(formData.get("businessType"));
  const subscriptionStatus = readString(formData.get("subscriptionStatus"));
  const subscriptionPrice = readString(formData.get("subscriptionPrice"));
  const subscriptionExpiresAt = readString(formData.get("subscriptionExpiresAt"));
  const distributorId = readString(formData.get("distributorId"));

  if (!id) return fail(t("faltaIdCuenta"));

  const errorNombre = validateName(name);
  if (errorNombre) return fail(await textoDeError(errorNombre));

  const errorSlug = validateSlug(slug);
  if (errorSlug) return fail(await textoDeError(errorSlug));

  const errorEstado = validateSubscriptionStatus(subscriptionStatus);
  if (errorEstado) return fail(await textoDeError(errorEstado));

  let precio: string | null = null;
  if (subscriptionPrice !== "") {
    const numero = Number(subscriptionPrice.replace(",", "."));
    if (!Number.isFinite(numero) || numero < 0) {
      return fail(t("precioNoPositivo"));
    }
    precio = numero.toFixed(2);
  }

  let vence: Date | null = null;
  if (subscriptionExpiresAt !== "") {
    const fecha = new Date(`${subscriptionExpiresAt}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return fail(t("fechaVencimientoInvalida"));
    vence = fecha;
  }

  try {
    const actual = await getAccountById(id);
    if (!actual) return fail(t("cuentaNoExiste"));

    await db
      .update(accounts)
      .set({
        name,
        slug,
        businessType: businessType || null,
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
    if (esClaveDuplicada(cause)) return fail(t("otraCuentaConEseSlug", { slug }));
    console.error("[admin] no se pudo actualizar la cuenta", { id, cause });
    return fail(await mensajeDeError("noSePudoGuardarCuenta", cause));
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
  const t = await getTranslations("Errores");

  try {
    const actual = await getAccountById(id);
    if (!actual) return fail(t("cuentaNoExiste"));

    await db.update(accounts).set({ active }).where(eq(accounts.id, id));

    const codigos = await getBraceletCodesOfAccount(id);
    for (const code of codigos) invalidateBracelet(code);

    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo cambiar el estado de la cuenta", { id, cause });
    return fail(await mensajeDeError("noSePudoCambiarEstadoCuenta", cause));
  }
}

/**
 * Borra una cuenta entera: sus locales, camareros, pulseras, categorías,
 * platos, archivos, escaneos y usuarios del panel se van con ella (ver
 * src/lib/borrado-en-cascada.ts). No hay vuelta atrás: no es un toggle.
 */
export async function deleteAccount(id: number): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  try {
    const actual = await getAccountById(id);
    if (!actual) return fail(t("cuentaNoExiste"));

    await borrarCuentaEnCascada(id);

    revalidarAdmin();
    revalidatePath("/admin/usuarios");
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo borrar la cuenta", { id, cause });
    return fail(await mensajeDeError("noSePudoBorrarCuenta", cause));
  }
}

/* ── Locales ─────────────────────────────────────────────────────────────── */

export async function createLocation(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  const accountId = readInt(formData.get("accountId"));
  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug")) || slugify(name);
  const googleReviewUrl = readString(formData.get("googleReviewUrl"));

  if (!accountId) return fail(t("elegiUnaCuenta"));

  const errorNombre = validateName(name);
  if (errorNombre) return fail(await textoDeError(errorNombre));

  const errorSlug = validateSlug(slug);
  if (errorSlug) return fail(await textoDeError(errorSlug));

  const errorUrl = validateOptionalUrl(googleReviewUrl, "googleReviewUrl");
  if (errorUrl) return fail(await textoDeError(errorUrl));

  try {
    if (!(await getAccountById(accountId))) return fail(t("cuentaElegidaNoExiste"));
    if (await getLocationBySlug(slug)) {
      return fail(t("localConEseSlug", { slug }));
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
    if (esClaveDuplicada(cause)) return fail(t("localConEseSlug", { slug }));
    console.error("[admin] no se pudo crear el local", { slug, cause });
    return fail(await mensajeDeError("noSePudoCrearLocal", cause));
  }
}

export async function updateLocation(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  const id = readInt(formData.get("id"));
  const accountId = readInt(formData.get("accountId"));
  const name = readString(formData.get("name"));
  const slug = readString(formData.get("slug"));

  if (!id) return fail(t("faltaIdLocal"));
  if (!accountId) return fail(t("elegiUnaCuenta"));

  const errorNombre = validateName(name);
  if (errorNombre) return fail(await textoDeError(errorNombre));

  const errorSlug = validateSlug(slug);
  if (errorSlug) return fail(await textoDeError(errorSlug));

  try {
    if (!(await getLocationById(id))) return fail(t("localYaNoExiste"));
    if (!(await getAccountById(accountId))) return fail(t("cuentaElegidaNoExiste"));

    await db.update(locations).set({ name, slug, accountId }).where(eq(locations.id, id));

    const codigos = await getBraceletCodesOfLocation(id);
    for (const code of codigos) invalidateBracelet(code);

    revalidarAdmin();
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) return fail(t("otroLocalConEseSlug", { slug }));
    console.error("[admin] no se pudo actualizar el local", { id, cause });
    return fail(await mensajeDeError("noSePudoGuardarLocal", cause));
  }
}

export async function toggleLocation(
  id: number,
  active: boolean
): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  try {
    if (!(await getLocationById(id))) return fail(t("localYaNoExiste"));

    await db.update(locations).set({ active }).where(eq(locations.id, id));

    const codigos = await getBraceletCodesOfLocation(id);
    for (const code of codigos) invalidateBracelet(code);

    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo cambiar el estado del local", { id, cause });
    return fail(await mensajeDeError("noSePudoCambiarEstadoLocal", cause));
  }
}

/**
 * Borra un local entero: sus camareros, pulseras, categorías, platos,
 * archivos y escaneos se van con él (ver src/lib/borrado-en-cascada.ts).
 */
export async function deleteLocation(id: number): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  try {
    if (!(await getLocationById(id))) return fail(t("localYaNoExiste"));

    await borrarLocalEnCascada(id);

    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo borrar el local", { id, cause });
    return fail(await mensajeDeError("noSePudoBorrarLocal", cause));
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
  const t = await getTranslations("Errores");
  const raw = readString(formData.get("destino"));

  if (raw === "" || raw === "stock") {
    return ok<Destino>({ locationId: null, distributorId: null });
  }

  if (raw.startsWith("local:")) {
    const locationId = Number.parseInt(raw.slice("local:".length), 10);
    if (!Number.isFinite(locationId) || locationId <= 0) {
      return fail(t("destinoNoValido"));
    }
    if (!(await getLocationById(locationId))) {
      return fail(t("localNoExiste"));
    }
    return ok<Destino>({ locationId, distributorId: null });
  }

  if (raw.startsWith("distribuidor:")) {
    const distributorId = raw.slice("distribuidor:".length);
    if (!(await getDistributorById(distributorId))) {
      return fail(t("distribuidorNoExiste"));
    }
    return ok<Destino>({ locationId: null, distributorId });
  }

  return fail(t("destinoNoValido"));
}

export async function createBracelet(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  const code = readString(formData.get("code"));
  const label = readString(formData.get("label"));
  const overrideUrl = readString(formData.get("overrideUrl"));
  const deviceType = readString(formData.get("deviceType")) || "pulsera";

  const errorCodigo = validateCode(code);
  if (errorCodigo) return fail(await textoDeError(errorCodigo));
  if (deviceType !== "pulsera" && deviceType !== "placa") {
    return fail(t("tipoDispositivoNoValido"));
  }

  const errorUrl = validateOptionalUrl(overrideUrl, "destinoDirecto");
  if (errorUrl) return fail(await textoDeError(errorUrl));

  const destino = await leerDestino(formData);
  if (!destino.ok) return destino;

  try {
    if (await getBraceletByCode(code)) {
      return fail(t("pulseraConEseCodigo", { code }));
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
    if (esClaveDuplicada(cause)) return fail(t("pulseraConEseCodigo", { code }));
    console.error("[admin] no se pudo crear la pulsera", { code, cause });
    return fail(await mensajeDeError("noSePudoCrearPulsera", cause));
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
  const t = await getTranslations("Errores");

  const prefix = readString(formData.get("prefix"));
  const start = readInt(formData.get("start")) ?? 1;
  const count = readInt(formData.get("count"));
  const padding = readInt(formData.get("padding")) ?? 3;
  const deviceType = readString(formData.get("deviceType")) || "pulsera";

  if (deviceType !== "pulsera" && deviceType !== "placa") {
    return fail(t("tipoDispositivoNoValido"));
  }
  if (prefix === "") return fail(t("prefijoVacio"));
  if (!/^[A-Za-z0-9._-]{1,20}$/.test(prefix)) {
    return fail(t("prefijoFormato"));
  }
  if (!count || count < 1) return fail(t("cantidadMinima"));
  if (count > 500) return fail(t("cantidadMaxima"));
  if (start < 0) return fail(t("inicioNegativo"));
  if (padding < 0 || padding > 10) return fail(t("rellenoRango"));

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const numero = String(start + i).padStart(padding, "0");
    const code = `${prefix}${numero}`;
    if (code.length > 50) {
      return fail(t("codigoGeneradoLargo", { code }));
    }
    codes.push(code);
  }

  const destino = await leerDestino(formData);
  if (!destino.ok) return destino;

  try {
    const existentes = await findExistingCodes(codes);
    const nuevos = codes.filter((code) => !existentes.has(code));

    if (nuevos.length === 0) return fail(t("codigosYaExisten"));

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
    return fail(await mensajeDeError("noSePudoGenerarLote", cause));
  }
}

export async function updateBracelet(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  const id = readInt(formData.get("id"));
  const code = readString(formData.get("code"));
  const waiterId = readInt(formData.get("waiterId"));
  const label = readString(formData.get("label"));
  const overrideUrl = readString(formData.get("overrideUrl"));
  const deviceType = readString(formData.get("deviceType")) || "pulsera";

  if (!id) return fail(t("faltaIdPulsera"));
  if (deviceType !== "pulsera" && deviceType !== "placa") {
    return fail(t("tipoDispositivoNoValido"));
  }

  const errorCodigo = validateCode(code);
  if (errorCodigo) return fail(await textoDeError(errorCodigo));

  const errorUrl = validateOptionalUrl(overrideUrl, "destinoDirecto");
  if (errorUrl) return fail(await textoDeError(errorUrl));

  const destino = await leerDestino(formData);
  if (!destino.ok) return destino;
  const { locationId, distributorId } = destino.data!;

  try {
    const actual = await getBraceletById(id);
    if (!actual) return fail(t("pulseraNoExiste"));

    // El camarero tiene que ser del mismo local que la pulsera. Una pulsera
    // que vuelve al stock pierde el camarero: ya no está en ningún salón.
    if (waiterId && locationId === null) {
      return fail(t("pulseraSinLocalConCamarero"));
    }
    if (waiterId) {
      const filas = await db
        .select({ locationId: waiters.locationId })
        .from(waiters)
        .where(eq(waiters.id, waiterId))
        .limit(1);
      if (!filas[0]) return fail(t("camareroElegidoNoExiste"));
      if (filas[0].locationId !== locationId) {
        return fail(t("camareroDeOtroLocal"));
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
    if (esClaveDuplicada(cause)) return fail(t("otraPulseraConEseCodigo", { code }));
    console.error("[admin] no se pudo actualizar la pulsera", { id, cause });
    return fail(await mensajeDeError("noSePudoGuardarPulsera", cause));
  }
}

export async function toggleBracelet(
  id: number,
  active: boolean
): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  try {
    const actual = await getBraceletById(id);
    if (!actual) return fail(t("pulseraNoExiste"));

    await db.update(bracelets).set({ active }).where(eq(bracelets.id, id));

    invalidateBracelet(actual.code);
    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo cambiar el estado de la pulsera", { id, cause });
    return fail(await mensajeDeError("noSePudoCambiarEstadoPulsera", cause));
  }
}

/** Borra una pulsera. Sus escaneos se van con ella. */
export async function deleteBracelet(id: number): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  try {
    const actual = await getBraceletById(id);
    if (!actual) return fail(t("pulseraNoExiste"));

    await db.delete(bracelets).where(eq(bracelets.id, id));

    invalidateBracelet(actual.code);
    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo borrar la pulsera", { id, cause });
    return fail(await mensajeDeError("noSePudoBorrarPulsera", cause));
  }
}

/* ── Entrar al panel de un restaurante ───────────────────────────────────── */

/**
 * Deja al admin operar el panel de un restaurante como si fuera el suyo.
 *
 * Sirve para configurarle la página o cargarle la carta a un cliente que
 * recién arranca, sin pedirle la contraseña ni crearse un usuario falso.
 *
 * La cuenta elegida viaja en una cookie de sesión y no en la URL: el panel
 * tiene seis páginas con filtros y paginación propios, y cualquier link que se
 * olvidara de arrastrar el parámetro sacaría al admin del restaurante a mitad
 * de camino. `httpOnly` porque nada del navegador necesita leerla, y `lax`
 * para que no viaje desde otro sitio.
 */
export async function entrarAlPanelDe(accountId: number): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  try {
    const cuenta = await getAccountById(accountId);
    if (!cuenta) return fail(t("cuentaElegidaNoExiste"));

    const almacen = await cookies();
    almacen.set(COOKIE_CUENTA_ADMIN, String(cuenta.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    revalidatePath("/panel", "layout");
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo entrar al panel", { accountId, cause });
    return fail(await mensajeDeError("noSePudoAbrirPanel", cause));
  }
}

/** Cierra el panel del restaurante y devuelve al admin a lo suyo. */
export async function salirDelPanelDeLaEmpresa(): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  const almacen = await cookies();
  almacen.delete(COOKIE_CUENTA_ADMIN);

  revalidatePath("/panel", "layout");
  return ok();
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
  const t = await getTranslations("Errores");

  const name = readString(formData.get("name"));
  const email = readString(formData.get("email")).toLowerCase();
  const password = readString(formData.get("password"));
  const role = readString(formData.get("role"));
  const accountId = readInt(formData.get("accountId"));

  const errorNombre = validateName(name);
  if (errorNombre) return fail(await textoDeError(errorNombre));

  const errorEmail = validateEmail(email);
  if (errorEmail) return fail(await textoDeError(errorEmail));

  const errorPassword = validatePassword(password);
  if (errorPassword) return fail(await textoDeError(errorPassword));

  if (!["admin", "distributor", "restaurant"].includes(role)) {
    return fail(t("rolNoValido"));
  }

  if (role === "restaurant" && !accountId) {
    return fail(t("usuarioSinCuenta"));
  }

  try {
    if (accountId && !(await getAccountById(accountId))) {
      return fail(t("cuentaElegidaNoExiste"));
    }

    const existentes = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existentes[0]) return fail(t("emailYaUsado"));

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
    if (esClaveDuplicada(cause)) return fail(t("emailYaUsado"));
    console.error("[admin] no se pudo crear el usuario", { email, cause });
    return fail(await mensajeDeError("noSePudoCrearUsuario", cause));
  }
}

/**
 * Edita un usuario existente: nombre, email, rol, cuenta y —opcionalmente— la
 * contraseña.
 *
 * La contraseña vacía significa "dejala como está". Es lo que uno quiere el
 * 90% de las veces que abre este formulario: corregir un email mal tipeado no
 * debería obligar a inventar una contraseña nueva y tener que avisarle al
 * usuario.
 *
 * Dos cosas que no deja hacer, las dos por el mismo motivo —que nadie se quede
 * afuera del sistema sin querer—:
 *
 *   - Cambiarte el rol a vos mismo.
 *   - Sacarle el rol admin al último admin que queda.
 */
export async function updateUser(formData: FormData): Promise<ActionResult> {
  const actual = await requireAdmin();
  const t = await getTranslations("Errores");

  const userId = readString(formData.get("userId"));
  const name = readString(formData.get("name"));
  const email = readString(formData.get("email")).toLowerCase();
  const role = readString(formData.get("role"));
  const accountId = readInt(formData.get("accountId"));
  const password = readString(formData.get("password"));

  if (userId === "") return fail(t("faltaIdUsuario"));

  const errorNombre = validateName(name);
  if (errorNombre) return fail(await textoDeError(errorNombre));

  const errorEmail = validateEmail(email);
  if (errorEmail) return fail(await textoDeError(errorEmail));

  if (!["admin", "distributor", "restaurant"].includes(role)) {
    return fail(t("rolNoValido"));
  }

  if (role === "restaurant" && !accountId) {
    return fail(t("usuarioSinCuenta"));
  }

  // Vacía = no se toca. Si escribieron algo, tiene que ser válida.
  if (password !== "") {
    const errorPassword = validatePassword(password);
    if (errorPassword) return fail(await textoDeError(errorPassword));
  }

  try {
    const existentes = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const anterior = existentes[0];
    if (!anterior) return fail(t("usuarioNoExiste"));

    if (userId === actual.id && role !== anterior.role) {
      return fail(t("noPodesCambiarteElRol"));
    }

    if (anterior.role === "admin" && role !== "admin") {
      const [conteo] = await db
        .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
        .from(user)
        .where(eq(user.role, "admin"));

      if ((conteo?.total ?? 0) <= 1) {
        return fail(t("ultimoAdmin"));
      }
    }

    // El email es único en la base; se avisa antes para dar un mensaje claro.
    const conEseEmail = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (conEseEmail[0] && conEseEmail[0].id !== userId) {
      return fail(t("otroEmailYaUsado"));
    }

    if (accountId && !(await getAccountById(accountId))) {
      return fail(t("cuentaElegidaNoExiste"));
    }

    await db
      .update(user)
      .set({
        name,
        email,
        role: role as "admin",
        // La cuenta solo aplica al rol restaurante: dejársela a un admin o a
        // un distribuidor no hace nada, pero confunde al leer la tabla.
        accountId: role === "restaurant" ? accountId : null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    if (password !== "") {
      const ctx = await auth.$context;
      const passwordHash = await ctx.password.hash(password);

      const credenciales = await db
        .select({ id: authAccount.id })
        .from(authAccount)
        .where(eq(authAccount.userId, userId))
        .limit(1);

      if (!credenciales[0]) {
        return fail(t("sinCredenciales"));
      }

      await db
        .update(authAccount)
        .set({ password: passwordHash })
        .where(eq(authAccount.id, credenciales[0].id));
    }

    revalidarAdmin();
    revalidatePath("/admin/usuarios");
    return ok();
  } catch (cause) {
    if (esClaveDuplicada(cause)) return fail(t("otroEmailYaUsado"));
    console.error("[admin] no se pudo actualizar el usuario", { userId, cause });
    return fail(await mensajeDeError("noSePudoGuardarUsuario", cause));
  }
}

/**
 * Borra un usuario.
 *
 * Dos cosas que no deja hacer, igual que `updateUser` —que nadie se quede
 * afuera del sistema sin querer—:
 *
 *   - Borrarte a vos mismo.
 *   - Borrar al último admin que queda.
 *
 * Si era un distribuidor, las cuentas que tenía asignadas quedan sin
 * distribuidor (no se borran: son cuentas de restaurantes que siguen
 * funcionando).
 */
export async function deleteUser(id: string): Promise<ActionResult> {
  const actual = await requireAdmin();
  const t = await getTranslations("Errores");

  if (id === actual.id) return fail(t("noPodesBorrarteVos"));

  try {
    const existentes = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    const usuario = existentes[0];
    if (!usuario) return fail(t("usuarioNoExiste"));

    if (usuario.role === "admin") {
      const [conteo] = await db
        .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
        .from(user)
        .where(eq(user.role, "admin"));

      if ((conteo?.total ?? 0) <= 1) {
        return fail(t("ultimoAdminNoSeBorra"));
      }
    }

    if (usuario.role === "distributor") {
      await db.update(accounts).set({ distributorId: null }).where(eq(accounts.distributorId, id));
    }

    await db.delete(user).where(eq(user.id, id));

    revalidarAdmin();
    revalidatePath("/admin/usuarios");
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo borrar el usuario", { id, cause });
    return fail(await mensajeDeError("noSePudoBorrarUsuario", cause));
  }
}

/* ── Camareros ───────────────────────────────────────────────────────────── */

/**
 * Borra un camarero, desde el admin.
 *
 * Normalmente los administra cada empresa desde su propio panel; esto es
 * para cuando hace falta limpiar uno desde acá. Sus pulseras no se borran:
 * se quedan sin camarero asignado (ver `bracelets.waiterId` en el esquema).
 */
export async function deleteWaiter(id: number): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");

  try {
    const filas = await db
      .select({ id: waiters.id })
      .from(waiters)
      .where(eq(waiters.id, id))
      .limit(1);
    if (!filas[0]) return fail(t("camareroNoExiste"));

    await db.delete(waiters).where(eq(waiters.id, id));

    revalidarAdmin();
    return ok();
  } catch (cause) {
    console.error("[admin] no se pudo borrar el empleado", { id, cause });
    return fail(await mensajeDeError("noSePudoBorrarCamarero", cause));
  }
}

/** Vacía el caché de la landing. Útil para diagnosticar. */
export async function clearLandingCache(): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("Errores");
  invalidateAll();
  return ok();
}
