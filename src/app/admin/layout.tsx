import { PanelShell } from "@/components/layout/panel-shell";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/cuentas", label: "Cuentas" },
  { href: "/admin/locales", label: "Locales" },
  { href: "/admin/pulseras", label: "Pulseras" },
  { href: "/admin/camareros", label: "Camareros" },
  { href: "/admin/escaneos", label: "Escaneos" },
  { href: "/admin/usuarios", label: "Usuarios" },
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
