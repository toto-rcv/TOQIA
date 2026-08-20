import { PanelShell } from "@/components/layout/panel-shell";
import { getAccountById } from "@/db/queries/accounts";
import { requireRestaurantUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ITEMS = [
  { href: "/panel", label: "Estadísticas", exact: true },
  { href: "/panel/pulseras", label: "Pulseras" },
  { href: "/panel/camareros", label: "Camareros" },
  { href: "/panel/escaneos", label: "Escaneos" },
  { href: "/panel/configuracion", label: "Mi página" },
];

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
  const user = await requireRestaurantUser();
  const account = await getAccountById(user.accountId);

  return (
    <PanelShell
      title={account?.name ?? "Toqia"}
      badge="Restaurante"
      email={user.email}
      items={ITEMS}
    >
      {children}
    </PanelShell>
  );
}
