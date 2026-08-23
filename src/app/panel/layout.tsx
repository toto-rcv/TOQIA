import { PanelShell } from "@/components/layout/panel-shell";
import { getAccountById } from "@/db/queries/accounts";
import { requireRestaurantUser } from "@/lib/session";

export const dynamic = "force-dynamic";

import type { NavItem } from "@/components/layout/panel-shell";

/**
 * El orden importa: en el celular las cuatro primeras van a la barra inferior
 * y el resto al cajón de "Más". Adelante queda lo que se mira todos los días.
 */
const ITEMS: NavItem[] = [
  { href: "/panel", label: "Resumen", exact: true, icon: "estadisticas" },
  { href: "/panel/pulseras", label: "Pulseras", icon: "pulseras" },
  { href: "/panel/carta", label: "Mi carta", icon: "carta" },
  { href: "/panel/escaneos", label: "Escaneos", icon: "escaneos" },
  { href: "/panel/camareros", label: "Camareros", icon: "camareros" },
  { href: "/panel/configuracion", label: "Mi página", icon: "pagina" },
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
