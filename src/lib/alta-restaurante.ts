import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { account as authAccount, accounts, db, locations, user } from "@/db";
import { getAccountBySlug } from "@/db/queries/accounts";
import { getLocationBySlug } from "@/db/queries/locations";
import { auth } from "./auth";
import {
  fail,
  ok,
  slugify,
  validateEmail,
  validateName,
  validateOptionalUrl,
  validatePassword,
  validateSlug,
  type ActionResult,
} from "./validation";

/**
 * Alta de un restaurante completo: cuenta + primer local + usuario que entra
 * al panel.
 *
 * Vive fuera de las acciones porque la usan dos paneles distintos —el
 * distribuidor da de alta a sus clientes, y el admin puede hacerlo por
 * cualquiera— y las tres inserciones tienen que ir juntas o no ir: una cuenta
 * sin local no sirve para nada, y un local sin usuario no lo puede configurar
 * nadie.
 */

export type DatosDeAlta = {
  /** Nombre comercial. Se usa para la cuenta y para el primer local. */
  nombre: string;
  /** Email del usuario que va a entrar al panel. */
  email: string;
  password: string;
  /** Nombre de la persona. Si viene vacío se usa el del restaurante. */
  nombreUsuario?: string;
  googleReviewUrl?: string;
  /** Distribuidor que lo da de alta. Null cuando lo crea el admin. */
  distributorId: string | null;
};

export type ResultadoDeAlta = {
  accountId: number;
  locationId: number;
  userId: string;
};

export async function altaDeRestaurante(
  datos: DatosDeAlta
): Promise<ActionResult<ResultadoDeAlta>> {
  const nombre = datos.nombre.trim();
  const email = datos.email.trim().toLowerCase();
  const googleReviewUrl = (datos.googleReviewUrl ?? "").trim();

  const errorNombre = validateName(nombre);
  if (errorNombre) return fail(errorNombre);

  const errorEmail = validateEmail(email);
  if (errorEmail) return fail(errorEmail);

  const errorPassword = validatePassword(datos.password);
  if (errorPassword) return fail(errorPassword);

  const errorUrl = validateOptionalUrl(
    googleReviewUrl,
    "El enlace de Google Reviews"
  );
  if (errorUrl) return fail(errorUrl);

  const slug = slugify(nombre);
  const errorSlug = validateSlug(slug);
  if (errorSlug) {
    return fail("Con ese nombre no se puede armar una dirección web válida.");
  }

  try {
    // Las tres colisiones posibles, con un mensaje que dice cuál es. Un
    // "no se pudo crear" genérico obliga a adivinar qué cambiar.
    if (await getAccountBySlug(slug)) {
      return fail(
        `Ya existe un restaurante con un nombre parecido ("${slug}"). Probá con otro.`
      );
    }
    if (await getLocationBySlug(slug)) {
      return fail(
        `Ya existe un local con un nombre parecido ("${slug}"). Probá con otro.`
      );
    }

    const yaExiste = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (yaExiste[0]) return fail("Ya existe un usuario con ese email.");

    // La contraseña se hashea con el propio Better Auth: escrita con otro
    // algoritmo, el login fallaría sin decir por qué.
    const ctx = await auth.$context;
    const passwordHash = await ctx.password.hash(datos.password);

    const [cuentaInsertada] = await db.insert(accounts).values({
      name: nombre,
      slug,
      distributorId: datos.distributorId,
      active: true,
    });
    const accountId = cuentaInsertada.insertId;

    const [localInsertado] = await db.insert(locations).values({
      accountId,
      name: nombre,
      slug,
      googleReviewUrl: googleReviewUrl === "" ? null : googleReviewUrl,
      active: true,
    });
    const locationId = localInsertado.insertId;

    const userId = randomUUID();
    const ahora = new Date();

    await db.insert(user).values({
      id: userId,
      name: datos.nombreUsuario?.trim() || nombre,
      email,
      emailVerified: true,
      role: "restaurant",
      accountId,
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

    return ok<ResultadoDeAlta>({ accountId, locationId, userId });
  } catch (cause) {
    console.error("[alta] no se pudo dar de alta el restaurante", {
      slug,
      email,
      cause,
    });
    return fail("No se pudo dar de alta el restaurante. Probá de nuevo.");
  }
}
