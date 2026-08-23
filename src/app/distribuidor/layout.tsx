import { PanelShell, type NavItem } from "@/components/layout/panel-shell";
import { requireDistributor } from "@/lib/session";

export const dynamic = "force-dynamic";

const ITEMS: NavItem[] = [
  { href: "/distribuidor", label: "Mis cuentas", exact: true, icon: "cuentas" },
];

/**
 * Panel del distribuidor.
 *
 * Etapa 1: solo lectura de las cuentas que tiene asignadas. El módulo de
 * ventas y comisiones queda para la etapa 2.
 */
export default async function DistribuidorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireDistributor();

  return (
    <PanelShell
      title="Toqia"
      badge="Distribuidor"
      email={user.email}
      items={ITEMS}
    >
      {children}
    </PanelShell>
  );
}
