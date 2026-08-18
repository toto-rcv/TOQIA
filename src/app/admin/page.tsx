import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ScansChart } from "@/components/admin/scans-chart";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { topBracelets } from "@/db/queries/bracelets";
import { getDashboardTotals, getScansPerDay } from "@/db/queries/dashboard";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Dashboard · Panel" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totals, perDay, ranking] = await Promise.all([
    getDashboardTotals(),
    getScansPerDay(30),
    topBracelets(8),
  ]);

  const maximoRanking = ranking[0]?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Escaneos registrados. Las fechas se guardan en UTC y se muestran en tu hora local."
      />

      {/* Métricas primero: el número manda, la etiqueta va debajo y chica. */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile value={totals.today} label="Escaneos hoy" destacado />
        <MetricTile value={totals.last7} label="Últimos 7 días" />
        <MetricTile value={totals.last30} label="Últimos 30 días" />
        <MetricTile value={totals.allTime} label="Histórico" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Escaneos por día · últimos 30 días</CardTitle>
          </CardHeader>
          <CardBody className="pt-5">
            <ScansChart data={perDay} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pulseras más escaneadas</CardTitle>
            <Link
              href="/admin/bracelets"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ex-text-muted
                         transition-colors hover:text-ex-blue-bright"
            >
              Ver todas
            </Link>
          </CardHeader>

          {ranking.length === 0 ? (
            <CardBody>
              <p className="py-8 text-center text-sm text-ex-text-muted">
                Sin escaneos todavía.
              </p>
            </CardBody>
          ) : (
            <div>
              {ranking.map((item) => (
                <div
                  key={item.braceletId}
                  className="ex-card-flush flex items-center gap-3 px-5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-medium text-ex-text">
                        {item.code}
                      </span>
                      {item.label ? (
                        <span className="truncate text-[11px] text-ex-text-muted">
                          {item.label}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-ex-text-muted">
                      {item.restaurantName}
                    </p>

                    {/* Barra de proporción: el mismo dato que el número, para
                        poder comparar de un vistazo sin leer cada cifra. */}
                    <div className="mt-1.5 h-[3px] w-full rounded-full bg-ex-border-subtle">
                      <div
                        className="h-full rounded-full bg-ex-blue"
                        style={{
                          width: `${maximoRanking > 0 ? (item.total / maximoRanking) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <span className="num shrink-0 text-sm text-ex-text">
                    {formatNumber(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function MetricTile({
  value,
  label,
  destacado = false,
}: {
  value: number;
  label: string;
  destacado?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <p
          className={
            destacado
              ? "font-mono text-metric-lg font-medium tabular-nums text-ex-blue-bright"
              : "ex-metric"
          }
        >
          {formatNumber(value)}
        </p>
        <p className="ex-label mt-1.5">{label}</p>
      </CardBody>
    </Card>
  );
}
