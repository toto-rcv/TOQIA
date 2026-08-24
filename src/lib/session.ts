import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import type { UserRole } from "@/db/schema";
import { auth } from "./auth";

/**
 * Control de acceso.
 *
 * Regla que se repite en todo el código: el layout de una sección protege las
 * páginas, pero NO protege una Server Action ni un Route Handler. Cada action
 * vuelve a pedir el rol que necesita por su cuenta.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountId: number | null;
};

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Devuelve el usuario con su rol, o null si no hay sesión. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;

  const raw = session.user as typeof session.user & {
    role?: string;
    accountId?: number | null;
  };

  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    // Si por algún motivo el campo viniera vacío, el rol menos privilegiado
    // es el default seguro.
    role: (raw.role as UserRole) ?? "restaurant",
    accountId: raw.accountId ?? null,
  };
}

/** Exige sesión, sin importar el rol. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige uno de los roles indicados. Si hay sesión pero el rol no corresponde,
 * manda a la sección propia del usuario en vez de al login: ya está
 * autenticado, el problema es que se metió donde no va.
 */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("admin");
}

export async function requireDistributor(): Promise<SessionUser> {
  return requireRole("distributor");
}

/**
 * Nombre de la cookie donde el admin guarda a qué restaurante entró.
 *
 * Es una cookie y no un parámetro en la URL para no tener que arrastrarlo por
 * las seis páginas del panel, sus filtros y su paginación: cualquier link que
 * se olvidara de propagarlo lo sacaría del restaurante a mitad de camino.
 */
export const COOKIE_CUENTA_ADMIN = "toqia_cuenta";

/**
 * Exige alguien que pueda operar el panel de un restaurante, y devuelve de qué
 * cuenta se trata.
 *
 * Dos caminos:
 *
 *  - **Usuario de restaurante**: su cuenta sale de la sesión. Un usuario con
 *    rol "restaurant" sin `accountId` no puede ver nada: sería un error de
 *    alta, y es preferible cortarlo acá antes que mostrarle datos de otro.
 *  - **Admin**: entra al panel del restaurante que haya elegido en
 *    /admin/cuentas. Es lo que le permite configurarle la página o cargarle la
 *    carta a un cliente sin pedirle la contraseña.
 *
 * Todo el panel pasa por acá —las seis páginas y todas sus Server Actions— así
 * que la cuenta que devuelve esta función es la única fuente de verdad sobre
 * qué datos se tocan. Nunca sale de la query string.
 */
export async function requireRestaurantUser(): Promise<
  SessionUser & { accountId: number }
> {
  const user = await requireUser();

  if (user.role === "admin") {
    const accountId = await cuentaElegidaPorElAdmin();
    // Sin cuenta elegida no hay panel que mostrar: lo mandamos a elegirla.
    if (accountId === null) redirect("/admin/cuentas?elegir=1");
    return { ...user, accountId };
  }

  if (user.role !== "restaurant") redirect(homeForRole(user.role));
  if (user.accountId === null) {
    redirect("/login?error=sin-cuenta");
  }
  return user as SessionUser & { accountId: number };
}

/**
 * La cuenta que el admin eligió, o null si no eligió ninguna o si la que
 * había ya no existe (la borró, o se vació la base).
 */
export async function cuentaElegidaPorElAdmin(): Promise<number | null> {
  const almacen = await cookies();
  const valor = almacen.get(COOKIE_CUENTA_ADMIN)?.value;
  if (!valor) return null;

  const id = Number.parseInt(valor, 10);
  if (!Number.isFinite(id) || id <= 0) return null;

  // Se valida contra la base: una cookie vieja apuntando a una cuenta borrada
  // haría fallar cada página del panel con un error sin explicación.
  const { getAccountById } = await import("@/db/queries/accounts");
  const cuenta = await getAccountById(id);
  return cuenta ? cuenta.id : null;
}

/** A dónde va cada rol después de ingresar. */
export function homeForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "distributor":
      return "/distribuidor";
    case "restaurant":
      return "/panel";
    default:
      return "/login";
  }
}
