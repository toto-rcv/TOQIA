import Link from "next/link";

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
  await requireAdmin();
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

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${params.period.label.toLowerCase()} · todo el sistema`}
      />

      <StatsFilters locations={[]} showLocation={false} maxDate={todayLocalKey()} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricTile
          value={summary.scans}
          label="Escaneos del período"
          variation={summary.variation.scans}
          highlight
        />
        <MetricTile
          value={summary.reviewClicks}
          label="Fueron a reseña"
          variation={summary.variation.reviewClicks}
        />
        <MetricTile
          value={summary.conversionRate.toFixed(0)}
          suffix="%"
          label="Conversión"
          hint={`Antes: ${summary.previous.conversionRate.toFixed(0)}%`}
        />
        <MetricTile value={total} label="Escaneos históricos" />
        <MetricTile
          value={activas}
          label="Cuentas activas"
          hint={`${cuentas.length} en total`}
        />
      </div>

      {porVencer.length > 0 ? (
        <div className="mb-4 rounded-card border border-ex-warning/25 bg-ex-warning/10 px-4 py-3">
          <p className="text-xs text-ex-warning">
            {porVencer.length}{" "}
            {porVencer.length === 1 ? "cuenta tiene" : "cuentas tienen"} la
            suscripción vencida:{" "}
            {porVencer.slice(0, 4).map((cuenta) => cuenta.name).join(", ")}
            {porVencer.length > 4 ? "…" : ""}.{" "}
            <Link href="/admin/cuentas" className="underline underline-offset-4">
              Revisar
            </Link>
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Evolución</CardTitle>
          </CardHeader>
          <CardBody className="pt-5">
            <EvolutionChart data={series} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas por escaneos</CardTitle>
            <Link
              href="/admin/cuentas"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ex-text-muted transition-colors hover:text-ex-blue-bright"
            >
              Ver todas
            </Link>
          </CardHeader>
          <RankingList
            items={[...cuentas]
              .sort((a, b) => b.scanCount - a.scanCount)
              .slice(0, 8)
              .map((cuenta) => ({
                id: cuenta.id,
                title: cuenta.name,
                subtitle: cuenta.active ? null : "inactiva",
                value: cuenta.scanCount,
                detail: `${formatNumber(cuenta.locationCount)} locales · ${formatNumber(cuenta.braceletCount)} pulseras`,
              }))}
            emptyMessage="Todavía no hay cuentas cargadas."
          />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pulseras más escaneadas</CardTitle>
          </CardHeader>
          <RankingList
            items={braceletRanking.map((fila) => ({
              id: fila.braceletId,
              title: fila.code,
              subtitle: fila.locationName,
              value: fila.scans,
              detail: `${fila.reviewClicks} reseñas`,
            }))}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Camareros del sistema</CardTitle>
          </CardHeader>
          <RankingList
            medals
            items={waiterRanking.map((fila) => ({
              id: fila.waiterId,
              title: fila.name,
              subtitle: fila.locationName,
              value: fila.scans,
              detail: `${fila.reviewClicks} reseñas · ${fila.conversionRate.toFixed(0)}%`,
            }))}
            emptyMessage="Ninguna pulsera tiene camarero asignado todavía."
          />
        </Card>
      </div>
    </>
  );
}
