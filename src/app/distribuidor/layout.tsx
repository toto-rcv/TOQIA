import { PanelShell, type NavItem } from "@/components/layout/panel-shell";
import { requireDistributor } from "@/lib/session";

export const dynamic = "force-dynamic";

const ITEMS: NavItem[] = [
  { href: "/distribuidor", label: "Resumen", exact: true, icon: "estadisticas" },
  { href: "/distribuidor/restaurantes", label: "Restaurantes", icon: "cuentas" },
  { href: "/distribuidor/pulseras", label: "Pulseras", icon: "pulseras" },
];

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
