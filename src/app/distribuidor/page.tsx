import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { EvolutionChart } from "@/components/stats/evolution-chart";
import { MetricTile } from "@/components/stats/metric-tile";
import { RankingList } from "@/components/stats/ranking-list";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import {
  listAccountIdsOfDistributor,
  listAccounts,
} from "@/db/queries/accounts";
import { getStockDeDistribuidor } from "@/db/queries/bracelets";
import {
  getLocationBreakdown,
  getSeries,
  getStatsSummary,
  getTotalScans,
  type StatsScope,
} from "@/db/queries/stats";
import { requireDistributor } from "@/lib/session";
import { parseStatsParams, type StatsSearchParams } from "@/lib/stats-params";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Resumen · Toqia Distribuidor" };
export const dynamic = "force-dynamic";

/**
 * Lo que rinde la cartera del distribuidor, de un vistazo.
 *
 * Todo sale de `listAccountIdsOfDistributor`, que se alimenta de la sesión y
 * nunca de la URL: esa lista es la única barrera entre un distribuidor y los
 * datos de otro.
 */
export default async function DistribuidorPage({
  searchParams,
}: {
  searchParams: Promise<StatsSearchParams>;
}) {
  const user = await requireDistributor();
  const params = parseStatsParams(await searchParams);

  const accountIds = await listAccountIdsOfDistributor(user.id);
  const scope: StatsScope = { accountIds };

  const [cuentas, resumen, serie, total, porLocal, stock] = await Promise.all([
    listAccounts({ distributorId: user.id }),
    getStatsSummary(scope, params.period),
    getSeries(scope, params.period, params.granularity),
    getTotalScans(scope),
    getLocationBreakdown(accountIds, params.period),
    getStockDeDistribuidor(user.id),
  ]);

  if (accountIds.length === 0 && stock.total === 0) {
    return (
      <>
        <PageHeader title="Resumen" />
        <Card>
          <EmptyState>
            Todavía no tenés cuentas asignadas ni pulseras entregadas. Cuando
            Toqia te entregue un lote vas a poder dar de alta tu primer
            restaurante desde{" "}
            <Link
              href="/distribuidor/restaurantes"
              className="text-ex-blue underline underline-offset-4"
            >
              Restaurantes
            </Link>
            .
          </EmptyState>
        </Card>
      </>
    );
  }

  const locales = cuentas.reduce((suma, cuenta) => suma + cuenta.locationCount, 0);

  return (
    <>
      <PageHeader
        title="Resumen"
        subtitle={`${params.period.label} · las fechas se muestran en hora local.`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:gap-4 lg:grid-cols-4">
        <MetricTile
          value={resumen.scans}
          label="Escaneos del período"
          variation={resumen.variation.scans}
          highlight
        />
        <MetricTile
          value={resumen.reviewClicks}
          label="Fueron a dejar reseña"
          variation={resumen.variation.reviewClicks}
        />
        <MetricTile
          value={resumen.conversionRate.toFixed(0)}
          suffix="%"
          label="Tasa de conversión"
          hint={`Período anterior: ${resumen.previous.conversionRate.toFixed(0)}%`}
        />
        <MetricTile value={total} label="Escaneos históricos" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricTile value={cuentas.length} label="Restaurantes" />
        <MetricTile value={locales} label="Locales" />
        <MetricTile
          value={stock.enStock}
          label="Pulseras sin colocar"
          hint={`${formatNumber(stock.total)} entregadas en total`}
        />
        <MetricTile value={stock.colocadas} label="Pulseras colocadas" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Evolución</CardTitle>
              <CardDescription className="mt-0.5">
                Cuántos escanearon y cuántos llegaron a Google
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="pt-5">
            <EvolutionChart data={serie} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tus locales</CardTitle>
          </CardHeader>
          <RankingList
            medals
            items={porLocal.map((fila) => ({
              id: fila.locationId,
              title: fila.name,
              value: fila.scans,
              detail: `${formatNumber(fila.reviewClicks)} reseñas · ${fila.conversionRate.toFixed(0)}% de conversión`,
            }))}
            emptyMessage="Todavía no hay escaneos en este período."
          />
        </Card>
      </div>
    </>
  );
}
