import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/layout/panel-shell";
import { getAccountById } from "@/db/queries/accounts";
import { requireRestaurantUser } from "@/lib/session";
import { AvisoDeAdmin } from "./aviso-admin";

export const dynamic = "force-dynamic";

import type { NavItem } from "@/components/layout/panel-shell";

/** El panel del restaurante: nunca en un buscador. */
export const metadata = { robots: { index: false, follow: false } };

/**
 * Panel del restaurante.
 *
 * El guard vive acá y cubre todas las rutas de /panel. Cada Server Action
 * vuelve a verificar por su cuenta: un layout no protege un POST directo.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, t] = await Promise.all([
    requireRestaurantUser(),
    getTranslations("Nav"),
  ]);
  const account = await getAccountById(user.accountId);

  const items: NavItem[] = [
    { href: "/panel", label: t("resumen"), exact: true, icon: "estadisticas" },
    { href: "/panel/pulseras", label: t("pulseras"), icon: "pulseras" },
    { href: "/panel/carta", label: t("catalogo"), icon: "carta" },
    { href: "/panel/escaneos", label: t("escaneos"), icon: "escaneos" },
    { href: "/panel/camareros", label: t("empleados"), icon: "camareros" },
    { href: "/panel/configuracion", label: t("pagina"), icon: "pagina" },
  ];

  // Un admin puede entrar al panel de cualquier empresa desde /admin/cuentas.
  // La chapa de arriba cambia para que no se confunda con su propio panel.
  const comoAdmin = user.role === "admin";

  /**
   * Qué dice la chapa debajo del nombre.
   *
   * Si la empresa tiene rubro cargado, ese: una ferretería quiere leer
   * "Ferretería" y no "Empresa". Sin rubro cae en la palabra genérica, que es
   * lo que ven todas las cuentas que existían antes de que el campo apareciera.
   *
   * El rubro lo escribe quien da de alta la empresa, así que no pasa por las
   * traducciones: se muestra tal cual en los siete idiomas.
   */
  const rubro = account?.businessType?.trim() || t("empresa");

  return (
    <PanelShell
      title={account?.name ?? "Toqia"}
      badge={comoAdmin ? t("admin") : rubro}
      email={user.email}
      items={items}
    >
      {comoAdmin ? <AvisoDeAdmin nombreDeCuenta={account?.name ?? "este local"} /> : null}
      {children}
    </PanelShell>
  );
}
