import { PageHeader } from "@/components/admin/page-header";
import { EvolutionChart } from "@/components/stats/evolution-chart";
import { MetricTile } from "@/components/stats/metric-tile";
import { RankingList } from "@/components/stats/ranking-list";
import { StatsFilters } from "@/components/stats/stats-filters";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listLocationOptions } from "@/db/queries/locations";
import {
  getBraceletRanking,
  getLocationBreakdown,
  getSeries,
  getStatsSummary,
  getTotalScans,
  getWaiterRanking,
  type StatsScope,
} from "@/db/queries/stats";
import { requireRestaurantUser } from "@/lib/session";
import { parseStatsParams, type StatsSearchParams } from "@/lib/stats-params";
import { todayLocalKey } from "@/lib/time";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Estadísticas · Toqia" };
export const dynamic = "force-dynamic";

export default async function PanelStatsPage({
  searchParams,
}: {
  searchParams: Promise<StatsSearchParams>;
}) {
  const user = await requireRestaurantUser();
  const params = parseStatsParams(await searchParams);

  const locations = await listLocationOptions(user.accountId);

  // El local del filtro tiene que ser de esta cuenta. Si alguien edita el
  // número en la URL, se ignora y se muestran todos los suyos.
  const locationId = locations.some((item) => item.id === params.locationId)
    ? params.locationId
    : undefined;

  // accountId sale SIEMPRE de la sesión, nunca de la query string.
  const scope: StatsScope = { accountId: user.accountId, locationId };

  const [total, summary, series, braceletRanking, waiterRanking, breakdown] =
    await Promise.all([
      getTotalScans(scope),
      getStatsSummary(scope, params.period),
      getSeries(scope, params.period, params.granularity),
      getBraceletRanking(scope, params.period, 8),
      getWaiterRanking(scope, params.period, 10),
      locations.length > 1
        ? getLocationBreakdown(user.accountId, params.period)
        : Promise.resolve([]),
    ]);

  return (
    <>
      <PageHeader
        title="Resumen"
        subtitle={`${params.period.label} · las fechas se muestran en hora local.`}
      />

      <StatsFilters locations={locations} maxDate={todayLocalKey()} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:gap-4 lg:grid-cols-4">
        <MetricTile
          value={summary.scans}
          label="Escaneos del período"
          variation={summary.variation.scans}
          highlight
        />
        <MetricTile
          value={summary.reviewClicks}
          label="Fueron a dejar reseña"
          variation={summary.variation.reviewClicks}
        />
        <MetricTile
          value={summary.conversionRate.toFixed(0)}
          suffix="%"
          label="Tasa de conversión"
          hint={`Período anterior: ${summary.previous.conversionRate.toFixed(0)}%`}
        />
        <MetricTile value={total} label="Escaneos históricos" />
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
            <EvolutionChart data={series} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking de camareros</CardTitle>
          </CardHeader>
          <RankingList
            medals
            items={waiterRanking.map((fila) => ({
              id: fila.waiterId,
              title: fila.name,
              subtitle: locations.length > 1 ? fila.locationName : null,
              value: fila.scans,
              detail: `${fila.reviewClicks} reseñas · ${fila.conversionRate.toFixed(0)}% de conversión`,
            }))}
            emptyMessage="Ningún camarero tiene pulseras asignadas todavía."
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pulseras más escaneadas</CardTitle>
          </CardHeader>
          <RankingList
            items={braceletRanking.map((fila) => ({
              id: fila.braceletId,
              title: fila.code,
              subtitle: fila.label ?? fila.waiterName,
              value: fila.scans,
              detail: `${fila.reviewClicks} reseñas`,
            }))}
          />
        </Card>

        {breakdown.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>Comparación entre locales</CardTitle>
            </CardHeader>
            <RankingList
              items={breakdown.map((fila) => ({
                id: fila.locationId,
                title: fila.name,
                value: fila.scans,
                detail: `${formatNumber(fila.reviewClicks)} reseñas · ${fila.conversionRate.toFixed(0)}% de conversión`,
              }))}
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
