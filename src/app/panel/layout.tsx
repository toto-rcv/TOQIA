import { PanelShell } from "@/components/layout/panel-shell";
import { getAccountById } from "@/db/queries/accounts";
import { requireRestaurantUser } from "@/lib/session";
import { AvisoDeAdmin } from "./aviso-admin";

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

  // Un admin puede entrar al panel de cualquier restaurante desde /admin/cuentas.
  // La chapa de arriba cambia para que no se confunda con su propio panel.
  const comoAdmin = user.role === "admin";

  return (
    <PanelShell
      title={account?.name ?? "Toqia"}
      badge={comoAdmin ? "Admin" : "Restaurante"}
      email={user.email}
      items={ITEMS}
    >
      {comoAdmin ? <AvisoDeAdmin nombreDeCuenta={account?.name ?? "este local"} /> : null}
      {children}
    </PanelShell>
  );
}
