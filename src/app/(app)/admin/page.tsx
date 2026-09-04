import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { EvolutionChart } from "@/components/stats/evolution-chart";
import { MetricTile } from "@/components/stats/metric-tile";
import { RankingList } from "@/components/stats/ranking-list";
import { StatsFilters } from "@/components/stats/stats-filters";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { listAccounts } from "@/db/queries/accounts";
import {
  getBraceletRanking,
  getSeries,
  getStatsSummary,
  getTotalScans,
  getWaiterRanking,
} from "@/db/queries/stats";
import { requireAdmin } from "@/lib/session";
import { parseStatsParams, type StatsSearchParams } from "@/lib/stats-params";
import { todayLocalKey } from "@/lib/time";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Dashboard · Toqia Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<StatsSearchParams>;
}) {
  const [, t] = await Promise.all([
    requireAdmin(),
    getTranslations("Stats"),
  ]);
  const params = parseStatsParams(await searchParams);

  // Alcance global: el admin ve el sistema entero.
  const scope = {};

  const [total, summary, series, braceletRanking, waiterRanking, cuentas] =
    await Promise.all([
      getTotalScans(scope),
      getStatsSummary(scope, params.period),
      getSeries(scope, params.period, params.granularity),
      getBraceletRanking(scope, params.period, 8),
      getWaiterRanking(scope, params.period, 8),
      listAccounts(),
    ]);

  const activas = cuentas.filter((cuenta) => cuenta.active).length;
  const porVencer = cuentas.filter(
    (cuenta) =>
      cuenta.subscriptionExpiresAt &&
      new Date(cuenta.subscriptionExpiresAt).getTime() < Date.now()
  );

  const presetKey = `label${params.periodKey}`;
  const periodLabel = t.has(presetKey as any) ? t(presetKey as any) : params.period.label;

  const listaCuentasVencidas = porVencer.slice(0, 4).map((cuenta) => cuenta.name).join(", ") +
    (porVencer.length > 4 ? "…" : "");

  return (
    <>
      <PageHeader
        title={t("dashboard")}
        subtitle={`${periodLabel.toLowerCase()} · ${t("todoElSistema")}`}
      />

      <StatsFilters locations={[]} showLocation={false} maxDate={todayLocalKey()} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricTile
          value={summary.scans}
          label={t("escaneosPeriodo")}
          variation={summary.variation.scans}
          highlight
        />
        <MetricTile
          value={summary.reviewClicks}
          label={t("fueronAResenaCorta")}
          variation={summary.variation.reviewClicks}
        />
        <MetricTile
          value={summary.conversionRate.toFixed(0)}
          suffix="%"
          label={t("conversion")}
          hint={t("antes", { val: summary.previous.conversionRate.toFixed(0) })}
        />
        <MetricTile value={total} label={t("escaneosHistoricos")} />
        <MetricTile
          value={activas}
          label={t("cuentasActivas")}
          hint={t("enTotal", { n: cuentas.length })}
        />
      </div>

      {porVencer.length > 0 ? (
        <div className="mb-4 rounded-card border border-ex-warning/25 bg-ex-warning/10 px-4 py-3">
          <p className="text-xs text-ex-warning">
            {porVencer.length === 1
              ? t("suscripcionVencidaSingular", { n: 1, lista: listaCuentasVencidas })
              : t("suscripcionVencidaPlural", { n: porVencer.length, lista: listaCuentasVencidas })}
            <Link href="/admin/cuentas" className="underline underline-offset-4">
              {t("revisar")}
            </Link>
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("evolucion")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-5">
            <EvolutionChart data={series} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("cuentasPorEscaneos")}</CardTitle>
            <Link
              href="/admin/cuentas"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ex-text-muted transition-colors hover:text-ex-blue-bright"
            >
              {t("verTodas")}
            </Link>
          </CardHeader>
          <RankingList
            items={[...cuentas]
              .sort((a, b) => b.scanCount - a.scanCount)
              .slice(0, 8)
              .map((cuenta) => ({
                id: cuenta.id,
                title: cuenta.name,
                subtitle: cuenta.active ? null : t("inactiva"),
                value: cuenta.scanCount,
                detail: t("localesYPulseras", {
                  locales: formatNumber(cuenta.locationCount),
                  pulseras: formatNumber(cuenta.braceletCount),
                }),
              }))}
            emptyMessage={t("todaviaSinCuentas")}
          />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("pulserasMasEscaneadas")}</CardTitle>
          </CardHeader>
          <RankingList
            items={braceletRanking.map((fila) => ({
              id: fila.braceletId,
              title: fila.code,
              subtitle: fila.locationName,
              value: fila.scans,
              detail: t("resenas", { n: fila.reviewClicks }),
            }))}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("camarerosDelSistema")}</CardTitle>
          </CardHeader>
          <RankingList
            medals
            items={waiterRanking.map((fila) => ({
              id: fila.waiterId,
              title: fila.name,
              subtitle: fila.locationName,
              value: fila.scans,
              detail: t("resenasConConversionCorta", {
                resenas: fila.reviewClicks,
                conversion: fila.conversionRate.toFixed(0),
              }),
            }))}
            emptyMessage={t("sinCamarerosSistema")}
          />
        </Card>
      </div>
    </>
  );
}
