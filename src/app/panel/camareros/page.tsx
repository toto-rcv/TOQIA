import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listLocationOptions } from "@/db/queries/locations";
import { listWaiters } from "@/db/queries/waiters";
import { requireRestaurantUser } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";
import { NewWaiterDialog, WaiterRowActions } from "./waiter-dialogs";

export const metadata = { title: "Camareros · Toqia" };
export const dynamic = "force-dynamic";

export default async function PanelWaitersPage() {
  const user = await requireRestaurantUser();

  const [waiters, locations] = await Promise.all([
    listWaiters({ accountId: user.accountId }),
    listLocationOptions(user.accountId),
  ]);

  const variosLocales = locations.length > 1;

  return (
    <>
      <PageHeader
        title="Camareros"
        subtitle="Desactivar a alguien no borra sus escaneos: el historial se conserva."
      >
        <NewWaiterDialog locations={locations} />
      </PageHeader>

      {waiters.length === 0 ? (
        <Card>
          <EmptyState>
            Todavía no cargaste camareros. Creá uno y después asignale pulseras
            desde la sección Pulseras.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Nombre</Th>
                {variosLocales ? <Th className="w-[200px]">Local</Th> : null}
                <Th className="w-[110px] text-right">Pulseras</Th>
                <Th className="w-[120px]">Alta</Th>
                <Th className="w-[100px]">Estado</Th>
                <Th className="w-[90px] text-right">Acciones</Th>
              </tr>
            </Thead>
            <tbody>
              {waiters.map((camarero) => (
                <Tr key={camarero.id} className={camarero.active ? undefined : "opacity-60"}>
                  <Td className="text-sm text-ex-text">{camarero.name}</Td>
                  {variosLocales ? (
                    <Td className="text-xs">{camarero.locationName}</Td>
                  ) : null}
                  <Td className="num text-right text-sm text-ex-text">
                    {formatNumber(camarero.braceletCount)}
                  </Td>
                  <Td className="num text-[11px]">{formatDate(camarero.createdAt)}</Td>
                  <Td>
                    <Badge tone={camarero.active ? "active" : "inactive"}>
                      {camarero.active ? "activo" : "inactivo"}
                    </Badge>
                  </Td>
                  <Td>
                    <WaiterRowActions waiter={camarero} />
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
