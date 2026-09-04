import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccounts, listDistributors } from "@/db/queries/accounts";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";
import { AccountRowActions, NewAccountDialog } from "./account-dialogs";

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Cuentas");
  return { title: t("titulo") };
}
export const dynamic = "force-dynamic";

/** El tono es visual; el nombre del estado sale de las traducciones. */
const ETIQUETA_ESTADO: Record<
  string,
  { clave: string; tone: "active" | "inactive" | "warning" | "danger" }
> = {
  trial: { clave: "estadoPrueba", tone: "warning" },
  active: { clave: "estadoActiva", tone: "active" },
  past_due: { clave: "estadoImpaga", tone: "warning" },
  cancelled: { clave: "estadoCancelada", tone: "danger" },
};

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ elegir?: string }>;
}) {
  await requireAdmin();

  // Se llega con ?elegir=1 desde /panel: un admin sin restaurante elegido no
  // tiene panel que mirar, y el aviso le dice qué le falta hacer.
  const [{ elegir }, cuentas, distribuidores, t, locale] = await Promise.all([
    searchParams,
    listAccounts(),
    listDistributors(),
    getTranslations("Cuentas"),
    getLocale(),
  ]);

  const ahora = Date.now();

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={t("subtitulo")}
      >
        <NewAccountDialog />
      </PageHeader>

      {elegir ? (
        <div className="mb-4 rounded-card border border-ex-warning/30 bg-ex-warning/10 px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-ex-text">
            {t.rich("avisoElegir", {
              icono: () => (
                <ExternalLink
                  className="inline size-3.5 -translate-y-px"
                  aria-hidden
                />
              ),
            })}
          </p>
        </div>
      ) : null}

      {cuentas.length === 0 ? (
        <Card>
          <EmptyState>{t("sinCuentas")}</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>{t("colCuenta")}</Th>
                <Th className="w-[130px]">{t("colSuscripcion")}</Th>
                <Th className="w-[110px]">{t("colVence")}</Th>
                <Th className="w-[150px]">{t("colDistribuidor")}</Th>
                <Th className="w-[90px] text-right">{t("colLocales")}</Th>
                <Th className="w-[90px] text-right">{t("colPulseras")}</Th>
                <Th className="w-[100px] text-right">{t("colEscaneos")}</Th>
                <Th className="w-[90px]">{t("colEstado")}</Th>
                <Th className="w-[90px] text-right">{t("colAcciones")}</Th>
              </tr>
            </Thead>
            <tbody>
              {cuentas.map((cuenta) => {
                const estado = ETIQUETA_ESTADO[cuenta.subscriptionStatus];
                const etiquetaDeEstado = estado
                  ? t(estado.clave)
                  : cuenta.subscriptionStatus;
                const tonoDeEstado = estado?.tone ?? ("inactive" as const);
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
                      <Badge tone={tonoDeEstado}>{etiquetaDeEstado}</Badge>
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
                        ? formatDate(cuenta.subscriptionExpiresAt, locale)
                        : "—"}
                    </Td>

                    <Td className="text-xs">{cuenta.distributorName ?? "—"}</Td>

                    <Td className="num text-right text-sm text-ex-text">
                      {formatNumber(cuenta.locationCount, locale)}
                    </Td>
                    <Td className="num text-right text-sm text-ex-text">
                      {formatNumber(cuenta.braceletCount, locale)}
                    </Td>
                    <Td className="num text-right text-sm text-ex-text">
                      {formatNumber(cuenta.scanCount, locale)}
                    </Td>

                    <Td>
                      <Badge tone={cuenta.active ? "active" : "inactive"}>
                        {cuenta.active ? t("alta") : t("baja")}
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
