import { redirect } from "next/navigation";

import { getSessionUser, homeForRole } from "@/lib/session";

export const metadata = { title: "Acceso · Toqia", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * La entrada al sistema.
 *
 * Vivía en `/`, pero `/` ahora es el sitio público de Toqia: la web que ve un
 * dueño de restaurante antes de ser cliente. Los paneles siguen en sus rutas
 * de siempre (/admin, /panel, /distribuidor) — esta página es solo el punto
 * de entrada que decide a cuál de las tres mandar a cada uno, así el
 * formulario de login no necesita saber nada de roles.
 */
export default async function Empresa() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(homeForRole(user.role));
}
