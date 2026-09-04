import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { etiquetaDePeriodo } from "@/i18n/periodo";

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

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Stats");
  return { title: t("resumen") };
}
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
  const [crudos, t, ts, locale] = await Promise.all([
    searchParams,
    getTranslations("Distribuidor"),
    getTranslations("Stats"),
    getLocale(),
  ]);
  const params = parseStatsParams(crudos);

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
        <PageHeader title={ts("resumen")} />
        <Card>
          <EmptyState>
            {t.rich("sinNada", {
              enlace: (chunks) => (
                <Link
                  href="/distribuidor/restaurantes"
                  className="text-ex-blue underline underline-offset-4"
                >
                  {chunks}
                </Link>
              ),
            })}
          </EmptyState>
        </Card>
      </>
    );
  }

  const locales = cuentas.reduce((suma, cuenta) => suma + cuenta.locationCount, 0);

  return (
    <>
      <PageHeader
        title={ts("resumen")}
        subtitle={`${etiquetaDePeriodo(ts, params.period, locale)} · ${ts(
          "fechasHoraLocal"
        )}`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:gap-4 lg:grid-cols-4">
        <MetricTile
          value={resumen.scans}
          label={ts("escaneosPeriodo")}
          variation={resumen.variation.scans}
          highlight
        />
        <MetricTile
          value={resumen.reviewClicks}
          label={ts("fueronAResena")}
          variation={resumen.variation.reviewClicks}
        />
        <MetricTile
          value={resumen.conversionRate.toFixed(0)}
          suffix="%"
          label={ts("tasaConversion")}
          hint={ts("periodoAnterior", {
            val: resumen.previous.conversionRate.toFixed(0),
          })}
        />
        <MetricTile value={total} label={ts("escaneosHistoricos")} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricTile value={cuentas.length} label={t("restaurantes")} />
        <MetricTile value={locales} label={t("locales")} />
        <MetricTile
          value={stock.enStock}
          label={t("pulserasSinColocar")}
          hint={t("entregadasEnTotal", {
            n: formatNumber(stock.total, locale),
          })}
        />
        <MetricTile value={stock.colocadas} label={t("pulserasColocadas")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{ts("evolucion")}</CardTitle>
              <CardDescription className="mt-0.5">
                {ts("subtituloEvolucion")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="pt-5">
            <EvolutionChart data={serie} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("tusLocales")}</CardTitle>
          </CardHeader>
          <RankingList
            medals
            items={porLocal.map((fila) => ({
              id: fila.locationId,
              title: fila.name,
              value: fila.scans,
              detail: ts("resenasConConversion", {
                resenas: formatNumber(fila.reviewClicks, locale),
                conversion: fila.conversionRate.toFixed(0),
              }),
            }))}
            emptyMessage={ts("sinEscaneosPeriodo")}
          />
        </Card>
      </div>
    </>
  );
}
