import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { MetricTile } from "@/components/stats/metric-tile";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Pagination } from "@/components/ui/pagination";
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
import { listAccountIdsOfDistributor } from "@/db/queries/accounts";
import {
  getStockDeDistribuidor,
  listBracelets,
} from "@/db/queries/bracelets";
import { listLocations } from "@/db/queries/locations";
import { parsePageParams } from "@/lib/pagination";
import { requireDistributor } from "@/lib/session";
import { braceletUrl, formatDateTime, formatNumber } from "@/lib/utils";
import { ColocarSelect } from "./colocar";

export const metadata = { title: "Pulseras · Toqia Distribuidor" };
export const dynamic = "force-dynamic";

/**
 * Las pulseras que Toqia le entregó a este distribuidor.
 *
 * Puede moverlas entre sus locales y devolverlas al stock, pero no crear
 * códigos: los códigos existen porque alguien grabó un chip físico, y
 * inventarlos desde acá rompería la correspondencia entre lo que hay en la
 * base y lo que hay en la caja.
 */
export default async function PulserasDistribuidorPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string; limit?: string }>;
}) {
  const user = await requireDistributor();
  const params = await searchParams;
  const pagina = parsePageParams(params);

  // "stock" y "colocadas" son las dos preguntas que uno le hace a esta
  // pantalla; cualquier otro valor se ignora y se muestran todas.
  const filtro =
    params.estado === "stock"
      ? { sinLocal: true }
      : params.estado === "colocadas"
        ? { sinLocal: false }
        : {};

  const accountIds = await listAccountIdsOfDistributor(user.id);

  const [pulseras, locales, stock] = await Promise.all([
    listBracelets({ distributorId: user.id, ...filtro }, pagina),
    listLocations({ accountIds }),
    getStockDeDistribuidor(user.id),
  ]);

  const opcionesLocales = locales.map((local) => ({
    id: local.id,
    name: local.name,
    accountName: local.accountName,
  }));

  return (
    <>
      <PageHeader
        title="Pulseras"
        subtitle="Las que te entregó Toqia. Elegí en qué local va cada una."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <MetricTile value={stock.total} label="Entregadas" />
        <MetricTile value={stock.enStock} label="Sin colocar" highlight />
        <MetricTile value={stock.colocadas} label="Colocadas" />
      </div>

      <FiltroEstado actual={params.estado} />

      {stock.total === 0 ? (
        <Card>
          <EmptyState>
            Toqia todavía no te entregó pulseras. Cuando lo haga, aparecen acá
            para que las repartas entre tus restaurantes.
          </EmptyState>
        </Card>
      ) : pulseras.total === 0 ? (
        <Card>
          <EmptyState>No hay pulseras con este filtro.</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Tabla en escritorio */}
          <div className="hidden sm:block">
            <Table>
              <Thead>
                <tr>
                  <Th className="w-[110px]">Código</Th>
                  <Th className="w-[230px]">Local</Th>
                  <Th className="w-[220px]">URL del chip</Th>
                  <Th className="w-[85px] text-right">Escaneos</Th>
                  <Th className="w-[85px] text-right">Reseñas</Th>
                  <Th className="w-[130px]">Último</Th>
                </tr>
              </Thead>
              <tbody>
                {pulseras.data.map((pulsera) => {
                  const url = braceletUrl(pulsera.code);

                  return (
                    <Tr
                      key={pulsera.id}
                      className={pulsera.active ? undefined : "opacity-60"}
                    >
                      <Td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-medium text-ex-text">
                            {pulsera.code}
                          </span>
                          {pulsera.locationId === null ? (
                            <Badge tone="warning">stock</Badge>
                          ) : null}
                          {!pulsera.active ? <Badge tone="inactive">off</Badge> : null}
                        </div>
                      </Td>

                      <Td>
                        <ColocarSelect
                          braceletId={pulsera.id}
                          locationId={pulsera.locationId}
                          locales={opcionesLocales}
                        />
                      </Td>

                      <Td>
                        <div className="flex items-center gap-2">
                          <span
                            className="min-w-0 flex-1 truncate font-mono text-[11px] text-ex-text-muted"
                            title={url}
                          >
                            {url}
                          </span>
                          <CopyButton value={url} label="Copiar URL para grabar" />
                        </div>
                      </Td>

                      <Td className="num text-right text-sm text-ex-text">
                        {formatNumber(pulsera.scanCount)}
                      </Td>
                      <Td className="num text-right text-sm text-ex-text-secondary">
                        {formatNumber(pulsera.reviewClicks)}
                      </Td>
                      <Td className="num text-[11px]">
                        {formatDateTime(pulsera.lastScanAt)}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Tarjetas en celular */}
          <ul className="sm:hidden">
            {pulseras.data.map((pulsera) => (
              <RowCard
                key={pulsera.id}
                className={pulsera.active ? undefined : "opacity-60"}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[13px] font-medium text-ex-text">
                    {pulsera.code}
                  </span>
                  {pulsera.locationId === null ? (
                    <Badge tone="warning">stock</Badge>
                  ) : null}
                </div>

                <div className="mt-2.5">
                  <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ex-text-muted">
                    Local
                  </p>
                  <ColocarSelect
                    braceletId={pulsera.id}
                    locationId={pulsera.locationId}
                    locales={opcionesLocales}
                  />
                </div>

                <RowFields className="grid-cols-3">
                  <RowField label="Escaneos">
                    <span className="font-semibold text-ex-text">
                      {formatNumber(pulsera.scanCount)}
                    </span>
                  </RowField>
                  <RowField label="Reseñas">
                    {formatNumber(pulsera.reviewClicks)}
                  </RowField>
                  <RowField label="Último">
                    <span className="text-[11px]">
                      {formatDateTime(pulsera.lastScanAt)}
                    </span>
                  </RowField>
                </RowFields>
              </RowCard>
            ))}
          </ul>

          <Pagination
            paged={pulseras}
            basePath="/distribuidor/pulseras"
            searchParams={params}
            itemLabel="pulseras"
          />
        </Card>
      )}
    </>
  );
}

/** Tres enlaces, no un desplegable: el estado se comparte y sobrevive al refresh. */
function FiltroEstado({ actual }: { actual?: string }) {
  const opciones = [
    { valor: undefined, label: "Todas" },
    { valor: "stock", label: "Sin colocar" },
    { valor: "colocadas", label: "Colocadas" },
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {opciones.map((opcion) => {
        const activo = actual === opcion.valor || (!actual && !opcion.valor);
        return (
          <Link
            key={opcion.label}
            href={
              opcion.valor
                ? `/distribuidor/pulseras?estado=${opcion.valor}`
                : "/distribuidor/pulseras"
            }
            className={
              "rounded-pill border px-3.5 py-1.5 text-[12px] font-medium transition-colors " +
              (activo
                ? "border-ex-blue bg-ex-blue-wash text-ex-blue-deep"
                : "border-ex-border bg-ex-surface text-ex-text-secondary hover:border-ex-blue/40")
            }
          >
            {opcion.label}
          </Link>
        );
      })}
    </div>
  );
}
