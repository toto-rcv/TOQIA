import { PageHeader } from "@/components/admin/page-header";
import { MetricTile } from "@/components/stats/metric-tile";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccounts } from "@/db/queries/accounts";
import { requireDistributor } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata = { title: "Mis cuentas · Toqia" };
export const dynamic = "force-dynamic";

const ETIQUETA_ESTADO: Record<
  string,
  { label: string; tone: "active" | "inactive" | "warning" | "danger" }
> = {
  trial: { label: "prueba", tone: "warning" },
  active: { label: "activa", tone: "active" },
  past_due: { label: "impaga", tone: "warning" },
  cancelled: { label: "cancelada", tone: "danger" },
};

export default async function DistribuidorPage() {
  const user = await requireDistributor();

  // El filtro por distribuidor sale de la sesión, no de la URL.
  const cuentas = await listAccounts({ distributorId: user.id });

  const totales = cuentas.reduce(
    (acc, cuenta) => ({
      locales: acc.locales + cuenta.locationCount,
      pulseras: acc.pulseras + cuenta.braceletCount,
      escaneos: acc.escaneos + cuenta.scanCount,
    }),
    { locales: 0, pulseras: 0, escaneos: 0 }
  );

  return (
    <>
      <PageHeader
        title="Mis cuentas"
        subtitle="Los restaurantes que tenés asignados."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile value={cuentas.length} label="Cuentas" highlight />
        <MetricTile value={totales.locales} label="Locales" />
        <MetricTile value={totales.pulseras} label="Pulseras" />
        <MetricTile value={totales.escaneos} label="Escaneos totales" />
      </div>

      {cuentas.length === 0 ? (
        <Card>
          <EmptyState>
            Todavía no tenés cuentas asignadas.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Cuenta</Th>
                <Th className="w-[130px]">Suscripción</Th>
                <Th className="w-[110px]">Vence</Th>
                <Th className="w-[90px] text-right">Locales</Th>
                <Th className="w-[90px] text-right">Pulseras</Th>
                <Th className="w-[100px] text-right">Escaneos</Th>
                <Th className="w-[90px]">Estado</Th>
              </tr>
            </Thead>
            <tbody>
              {cuentas.map((cuenta) => {
                const estado = ETIQUETA_ESTADO[cuenta.subscriptionStatus] ?? {
                  label: cuenta.subscriptionStatus,
                  tone: "inactive" as const,
                };

                return (
                  <Tr key={cuenta.id} className={cuenta.active ? undefined : "opacity-60"}>
                    <Td className="text-sm text-ex-text">{cuenta.name}</Td>
                    <Td>
                      <Badge tone={estado.tone}>{estado.label}</Badge>
                    </Td>
                    <Td className="num text-[11px]">
                      {cuenta.subscriptionExpiresAt
                        ? formatDate(cuenta.subscriptionExpiresAt)
                        : "—"}
                    </Td>
                    <Td className="num text-right text-sm text-ex-text">
                      {formatNumber(cuenta.locationCount)}
                    </Td>
                    <Td className="num text-right text-sm text-ex-text">
                      {formatNumber(cuenta.braceletCount)}
                    </Td>
                    <Td className="num text-right text-sm text-ex-text">
                      {formatNumber(cuenta.scanCount)}
                    </Td>
                    <Td>
                      <Badge tone={cuenta.active ? "active" : "inactive"}>
                        {cuenta.active ? "alta" : "baja"}
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <p className="mt-4 text-[11px] text-ex-text-muted">
        Las ventas y comisiones llegan en la próxima etapa.
      </p>
    </>
  );
}
