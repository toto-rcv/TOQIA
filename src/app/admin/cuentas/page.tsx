import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccounts, listDistributors } from "@/db/queries/accounts";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";
import { AccountRowActions, NewAccountDialog } from "./account-dialogs";

export const metadata = { title: "Cuentas · Toqia Admin" };
export const dynamic = "force-dynamic";

const ETIQUETA_ESTADO: Record<string, { label: string; tone: "active" | "inactive" | "warning" | "danger" }> = {
  trial: { label: "prueba", tone: "warning" },
  active: { label: "activa", tone: "active" },
  past_due: { label: "impaga", tone: "warning" },
  cancelled: { label: "cancelada", tone: "danger" },
};

export default async function AdminAccountsPage() {
  await requireAdmin();

  const [cuentas, distribuidores] = await Promise.all([
    listAccounts(),
    listDistributors(),
  ]);

  const ahora = Date.now();

  return (
    <>
      <PageHeader
        title="Cuentas"
        subtitle="Cada cuenta agrupa los locales de un cliente. Dar de baja una corta todas sus pulseras."
      >
        <NewAccountDialog />
      </PageHeader>

      {cuentas.length === 0 ? (
        <Card>
          <EmptyState>Todavía no hay cuentas cargadas.</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Cuenta</Th>
                <Th className="w-[130px]">Suscripción</Th>
                <Th className="w-[110px]">Vence</Th>
                <Th className="w-[150px]">Distribuidor</Th>
                <Th className="w-[90px] text-right">Locales</Th>
                <Th className="w-[90px] text-right">Pulseras</Th>
                <Th className="w-[100px] text-right">Escaneos</Th>
                <Th className="w-[90px]">Estado</Th>
                <Th className="w-[90px] text-right">Acciones</Th>
              </tr>
            </Thead>
            <tbody>
              {cuentas.map((cuenta) => {
                const estado = ETIQUETA_ESTADO[cuenta.subscriptionStatus] ?? {
                  label: cuenta.subscriptionStatus,
                  tone: "inactive" as const,
                };
                const vencida =
                  cuenta.subscriptionExpiresAt &&
                  new Date(cuenta.subscriptionExpiresAt).getTime() < ahora;

                return (
                  <Tr key={cuenta.id} className={cuenta.active ? undefined : "opacity-60"}>
                    <Td>
                      <Link
                        href={`/admin/locales?cuenta=${cuenta.id}`}
                        className="text-sm text-ex-text transition-colors hover:text-ex-blue-bright"
                      >
                        {cuenta.name}
                      </Link>
                      <p className="font-mono text-[10px] text-ex-text-disabled">
                        {cuenta.slug}
                      </p>
                    </Td>

                    <Td>
                      <Badge tone={estado.tone}>{estado.label}</Badge>
                      {cuenta.subscriptionPrice ? (
                        <p className="num mt-1 text-[10px] text-ex-text-muted">
                          ${cuenta.subscriptionPrice}
                        </p>
                      ) : null}
                    </Td>

                    <Td
                      className={
                        vencida ? "num text-[11px] text-ex-danger" : "num text-[11px]"
                      }
                    >
                      {cuenta.subscriptionExpiresAt
                        ? formatDate(cuenta.subscriptionExpiresAt)
                        : "—"}
                    </Td>

                    <Td className="text-xs">{cuenta.distributorName ?? "—"}</Td>

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

                    <Td>
                      <AccountRowActions
                        account={cuenta}
                        distributors={distribuidores}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
