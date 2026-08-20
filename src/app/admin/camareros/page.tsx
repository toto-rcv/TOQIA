import { AccountFilter } from "@/components/admin/account-filter";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccountOptions } from "@/db/queries/accounts";
import { listWaiters } from "@/db/queries/waiters";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata = { title: "Camareros · Toqia Admin" };
export const dynamic = "force-dynamic";

/**
 * Vista global de camareros.
 *
 * Es de solo lectura a propósito: los camareros los administra cada
 * restaurante desde su panel, que es quien sabe quién entra y quién se va.
 * Acá sirve para diagnosticar ("este local dice que el ranking está vacío") sin
 * tener que entrar con las credenciales del cliente.
 */
export default async function AdminWaitersPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string }>;
}) {
  await requireAdmin();
  const { cuenta } = await searchParams;

  const cuentaId = cuenta ? Number.parseInt(cuenta, 10) : NaN;
  const filtro = Number.isFinite(cuentaId) ? cuentaId : undefined;

  const [camareros, cuentas] = await Promise.all([
    listWaiters({ accountId: filtro }),
    listAccountOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Camareros"
        subtitle="Los administra cada restaurante desde su panel. Acá se ven todos."
      >
        <AccountFilter accounts={cuentas} />
      </PageHeader>

      {camareros.length === 0 ? (
        <Card>
          <EmptyState>
            Todavía ningún restaurante cargó camareros.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Nombre</Th>
                <Th className="w-[240px]">Local</Th>
                <Th className="w-[110px] text-right">Pulseras</Th>
                <Th className="w-[120px]">Alta</Th>
                <Th className="w-[100px]">Estado</Th>
              </tr>
            </Thead>
            <tbody>
              {camareros.map((camarero) => (
                <Tr
                  key={camarero.id}
                  className={camarero.active ? undefined : "opacity-60"}
                >
                  <Td className="text-sm text-ex-text">{camarero.name}</Td>
                  <Td className="text-xs">{camarero.locationName}</Td>
                  <Td className="num text-right text-sm text-ex-text">
                    {formatNumber(camarero.braceletCount)}
                  </Td>
                  <Td className="num text-[11px]">{formatDate(camarero.createdAt)}</Td>
                  <Td>
                    <Badge tone={camarero.active ? "active" : "inactive"}>
                      {camarero.active ? "activo" : "inactivo"}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
