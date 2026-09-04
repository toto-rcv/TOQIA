import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/layout/panel-shell";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

import type { NavItem } from "@/components/layout/panel-shell";

/** El panel de Toqia: nunca en un buscador. */
export const metadata = { robots: { index: false, follow: false } };

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
  const [user, t] = await Promise.all([
    requireAdmin(),
    getTranslations("Nav"),
  ]);

  const items: NavItem[] = [
    { href: "/admin", label: t("panel"), exact: true, icon: "estadisticas" },
    { href: "/admin/cuentas", label: t("cuentas"), icon: "cuentas" },
    { href: "/admin/locales", label: t("locales"), icon: "locales" },
    { href: "/admin/pulseras", label: t("pulseras"), icon: "pulseras" },
    { href: "/admin/camareros", label: t("empleados"), icon: "camareros" },
    { href: "/admin/escaneos", label: t("escaneos"), icon: "escaneos" },
    { href: "/admin/usuarios", label: t("usuarios"), icon: "usuarios" },
    { href: "/admin/mantenimiento", label: t("mantenimiento"), icon: "mantenimiento" },
  ];

  return (
    <PanelShell title="Toqia" badge={t("admin")} email={user.email} items={items}>
      {children}
    </PanelShell>
  );
}
