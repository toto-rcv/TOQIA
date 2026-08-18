import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

/**
 * Devuelve la sesión activa, o null si no hay.
 * Se usa donde queremos saber si hay sesión sin forzar el login.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Exige sesión. Si no hay, manda al login.
 *
 * Se llama desde el layout de /admin, así que cubre todas las rutas del panel
 * de una sola vez. Las Server Actions la vuelven a llamar por su cuenta: un
 * layout no protege un POST directo a una action.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
