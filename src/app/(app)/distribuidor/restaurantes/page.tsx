import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  RowCard,
  RowField,
  RowFields,
  Table,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui/table";
import { listAccounts } from "@/db/queries/accounts";
import { requireDistributor } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";
import { NuevoRestauranteDialog } from "./dialogs";

export const metadata = { title: "Restaurantes · Toqia Distribuidor" };
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

export default async function RestaurantesPage() {
  const user = await requireDistributor();

  // El filtro sale de la sesión, no de la URL.
  const cuentas = await listAccounts({ distributorId: user.id });

  return (
    <>
      <PageHeader
        title="Restaurantes"
        subtitle="Los que diste de alta. El estado de la suscripción lo maneja Toqia."
      >
        <NuevoRestauranteDialog />
      </PageHeader>

      {cuentas.length === 0 ? (
        <Card>
          <EmptyState>
            Todavía no diste de alta ningún restaurante. Con &ldquo;Nuevo
            restaurante&rdquo; se crea la cuenta, su local y el acceso al panel
            de una sola vez.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Tabla en escritorio */}
          <div className="hidden sm:block">
            <Table>
              <Thead>
                <tr>
                  <Th>Restaurante</Th>
                  <Th className="w-[120px]">Suscripción</Th>
                  <Th className="w-[110px]">Alta</Th>
                  <Th className="w-[90px] text-right">Locales</Th>
                  <Th className="w-[90px] text-right">Pulseras</Th>
                  <Th className="w-[100px] text-right">Escaneos</Th>
                </tr>
              </Thead>
              <tbody>
                {cuentas.map((cuenta) => {
                  const estado = ETIQUETA_ESTADO[cuenta.subscriptionStatus] ?? {
                    label: cuenta.subscriptionStatus,
                    tone: "inactive" as const,
                  };

                  return (
                    <Tr
                      key={cuenta.id}
                      className={cuenta.active ? undefined : "opacity-60"}
                    >
                      <Td>
                        <span className="block truncate text-[13px] font-medium text-ex-text">
                          {cuenta.name}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-ex-text-disabled">
                          {cuenta.slug}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={estado.tone}>{estado.label}</Badge>
                      </Td>
                      <Td className="num text-[11px]">
                        {formatDate(cuenta.createdAt)}
                      </Td>
                      <Td className="num text-right text-sm">
                        {formatNumber(cuenta.locationCount)}
                      </Td>
                      <Td className="num text-right text-sm">
                        {formatNumber(cuenta.braceletCount)}
                      </Td>
                      <Td className="num text-right text-sm text-ex-text">
                        {formatNumber(cuenta.scanCount)}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Tarjetas en celular: seis columnas no entran en 390px. */}
          <ul className="sm:hidden">
            {cuentas.map((cuenta) => {
              const estado = ETIQUETA_ESTADO[cuenta.subscriptionStatus] ?? {
                label: cuenta.subscriptionStatus,
                tone: "inactive" as const,
              };

              return (
                <RowCard
                  key={cuenta.id}
                  className={cuenta.active ? undefined : "opacity-60"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ex-text">
                        {cuenta.name}
                      </p>
                      <p className="truncate font-mono text-[10px] text-ex-text-disabled">
                        {cuenta.slug}
                      </p>
                    </div>
                    <Badge tone={estado.tone}>{estado.label}</Badge>
                  </div>

                  <RowFields className="grid-cols-3">
                    <RowField label="Locales">
                      {formatNumber(cuenta.locationCount)}
                    </RowField>
                    <RowField label="Pulseras">
                      {formatNumber(cuenta.braceletCount)}
                    </RowField>
                    <RowField label="Escaneos">
                      <span className="font-semibold text-ex-text">
                        {formatNumber(cuenta.scanCount)}
                      </span>
                    </RowField>
                  </RowFields>
                </RowCard>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
