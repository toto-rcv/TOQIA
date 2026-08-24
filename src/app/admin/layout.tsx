import { PanelShell } from "@/components/layout/panel-shell";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

import type { NavItem } from "@/components/layout/panel-shell";

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Panel", exact: true, icon: "estadisticas" },
  { href: "/admin/cuentas", label: "Cuentas", icon: "cuentas" },
  { href: "/admin/locales", label: "Locales", icon: "locales" },
  { href: "/admin/pulseras", label: "Pulseras", icon: "pulseras" },
  { href: "/admin/camareros", label: "Camareros", icon: "camareros" },
  { href: "/admin/escaneos", label: "Escaneos", icon: "escaneos" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "usuarios" },
  { href: "/admin/mantenimiento", label: "Mantenimiento", icon: "mantenimiento" },
];

/**
 * Panel de administración.
 *
 * El guard vive acá y cubre todas las rutas de /admin. Cada Server Action
 * vuelve a llamar a `requireAdmin()` por su cuenta: un layout no protege un
 * POST directo.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <PanelShell title="Toqia" badge="Admin" email={user.email} items={ITEMS}>
      {children}
    </PanelShell>
  );
}
