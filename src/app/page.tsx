import { redirect } from "next/navigation";

import { getSessionUser, homeForRole } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * La raíz no tiene contenido propio: manda a cada uno a su sección.
 * Es también el destino después de ingresar, así el formulario de login no
 * necesita saber nada de roles.
 */
export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(homeForRole(user.role));
}
