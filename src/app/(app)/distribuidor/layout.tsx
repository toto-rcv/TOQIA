import { getTranslations } from "next-intl/server";
import { PanelShell, type NavItem } from "@/components/layout/panel-shell";
import { requireDistributor } from "@/lib/session";

/** El panel del distribuidor: nunca en un buscador. */
export const metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * Panel del distribuidor.
 *
 * Ve y opera únicamente sobre lo suyo: las cuentas que tiene asignadas y las
 * pulseras que se le entregaron. El guard vive acá y cubre las tres páginas,
 * pero cada Server Action vuelve a pedir el rol y a verificar la pertenencia
 * por su cuenta: un layout no protege un POST directo.
 */
export default async function DistribuidorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, t] = await Promise.all([
    requireDistributor(),
    getTranslations("Nav"),
  ]);

  const items: NavItem[] = [
    { href: "/distribuidor", label: t("resumen"), exact: true, icon: "estadisticas" },
    { href: "/distribuidor/restaurantes", label: t("cuentas"), icon: "cuentas" },
    { href: "/distribuidor/pulseras", label: t("pulseras"), icon: "pulseras" },
  ];

  return (
    <PanelShell
      title="Toqia"
      badge="Distribuidor"
      email={user.email}
      items={items}
    >
      {children}
    </PanelShell>
  );
}
