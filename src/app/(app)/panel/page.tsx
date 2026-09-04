import { getLocale, getTranslations } from "next-intl/server";

import { etiquetaDePeriodo } from "@/i18n/periodo";
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

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Stats");
  return { title: t("resumen") };
}
export const dynamic = "force-dynamic";

export default async function PanelStatsPage({
  searchParams,
}: {
  searchParams: Promise<StatsSearchParams>;
}) {
  const [user, t, locale] = await Promise.all([
    requireRestaurantUser(),
    getTranslations("Stats"),
    getLocale(),
  ]);
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
        ? getLocationBreakdown([user.accountId], params.period)
        : Promise.resolve([]),
    ]);

  const periodLabel = etiquetaDePeriodo(t, params.period, locale);

  return (
    <>
      <PageHeader
        title={t("resumen")}
        subtitle={`${periodLabel} · ${t("fechasHoraLocal")}`}
      />

      <StatsFilters locations={locations} maxDate={todayLocalKey()} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:gap-4 lg:grid-cols-4">
        <MetricTile
          value={summary.scans}
          label={t("escaneosPeriodo")}
          variation={summary.variation.scans}
          highlight
        />
        <MetricTile
          value={summary.reviewClicks}
          label={t("fueronAResena")}
          variation={summary.variation.reviewClicks}
        />
        <MetricTile
          value={summary.conversionRate.toFixed(0)}
          suffix="%"
          label={t("tasaConversion")}
          hint={t("periodoAnterior", { val: summary.previous.conversionRate.toFixed(0) })}
        />
        <MetricTile value={total} label={t("escaneosHistoricos")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t("evolucion")}</CardTitle>
              <CardDescription className="mt-0.5">
                {t("subtituloEvolucion")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="pt-5">
            <EvolutionChart data={series} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("rankingCamareros")}</CardTitle>
          </CardHeader>
          <RankingList
            medals
            items={waiterRanking.map((fila) => ({
              id: fila.waiterId,
              title: fila.name,
              subtitle: locations.length > 1 ? fila.locationName : null,
              value: fila.scans,
              detail: t("resenasConConversion", {
                resenas: fila.reviewClicks,
                conversion: fila.conversionRate.toFixed(0),
              }),
            }))}
            emptyMessage={t("sinCamareros")}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("pulserasMasEscaneadas")}</CardTitle>
          </CardHeader>
          <RankingList
            items={braceletRanking.map((fila) => ({
              id: fila.braceletId,
              title: fila.code,
              subtitle: fila.label ?? fila.waiterName,
              value: fila.scans,
              detail: t("resenas", { n: fila.reviewClicks }),
            }))}
          />
        </Card>

        {breakdown.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("comparacionLocales")}</CardTitle>
            </CardHeader>
            <RankingList
              items={breakdown.map((fila) => ({
                id: fila.locationId,
                title: fila.name,
                value: fila.scans,
                detail: t("resenasConConversion", {
                  resenas: formatNumber(fila.reviewClicks, locale),
                  conversion: fila.conversionRate.toFixed(0),
                }),
              }))}
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
