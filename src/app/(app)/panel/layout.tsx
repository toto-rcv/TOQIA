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
    { href: "/panel/carta", label: t("carta"), icon: "carta" },
    { href: "/panel/escaneos", label: t("escaneos"), icon: "escaneos" },
    { href: "/panel/camareros", label: t("camareros"), icon: "camareros" },
    { href: "/panel/configuracion", label: t("pagina"), icon: "pagina" },
  ];

  // Un admin puede entrar al panel de cualquier restaurante desde /admin/cuentas.
  // La chapa de arriba cambia para que no se confunda con su propio panel.
  const comoAdmin = user.role === "admin";

  return (
    <PanelShell
      title={account?.name ?? "Toqia"}
      badge={comoAdmin ? t("admin") : t("restaurante")}
      email={user.email}
      items={items}
    >
      {comoAdmin ? <AvisoDeAdmin nombreDeCuenta={account?.name ?? "este local"} /> : null}
      {children}
    </PanelShell>
  );
}
