import { headers } from "next/headers";
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
 * Exige un usuario de restaurante y garantiza que tenga cuenta asignada.
 * Un usuario con rol "restaurant" sin `accountId` no puede ver nada: sería un
 * error de alta, y es preferible cortarlo acá antes que mostrar datos de otro.
 */
export async function requireRestaurantUser(): Promise<
  SessionUser & { accountId: number }
> {
  const user = await requireRole("restaurant");
  if (user.accountId === null) {
    redirect("/login?error=sin-cuenta");
  }
  return user as SessionUser & { accountId: number };
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
