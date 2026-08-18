import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listBracelets } from "@/db/queries/bracelets";
import { getRestaurantById } from "@/db/queries/restaurants";
import { braceletUrl, formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurantId = Number.parseInt(id, 10);

  if (!Number.isFinite(restaurantId)) notFound();

  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) notFound();

  const bracelets = await listBracelets({ restaurantId });

  const totalEscaneos = bracelets.reduce((acc, item) => acc + item.scanCount, 0);
  const activas = bracelets.filter((item) => item.active).length;

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admin/restaurants"
          className="font-mono text-[11px] uppercase tracking-[0.1em] text-ex-text-muted
                     transition-colors hover:text-ex-text-secondary"
        >
          ← Restaurantes
        </Link>
      </div>

      <PageHeader title={restaurant.name} subtitle={`/${restaurant.slug}`}>
        <Badge tone={restaurant.active ? "active" : "inactive"}>
          {restaurant.active ? "activo" : "inactivo"}
        </Badge>
        <Link href={`/admin/bracelets?restaurant=${restaurant.id}`}>
          <span className="ex-btn-ghost">Ver en pulseras</span>
        </Link>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile value={formatNumber(totalEscaneos)} label="Escaneos totales" />
        <MetricTile value={formatNumber(bracelets.length)} label="Pulseras" />
        <MetricTile value={formatNumber(activas)} label="Pulseras activas" />
        <MetricTile
          value={formatNumber(bracelets.length - activas)}
          label="Pulseras inactivas"
        />
      </div>

      <Card className="overflow-hidden">
        {bracelets.length === 0 ? (
          <EmptyState>
            Este restaurante todavía no tiene pulseras.{" "}
            <Link
              href={`/admin/bracelets?restaurant=${restaurant.id}`}
              className="text-ex-blue-bright underline underline-offset-4"
            >
              Cargar pulseras
            </Link>
          </EmptyState>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th className="w-[110px]">Código</Th>
                <Th className="w-[160px]">Etiqueta</Th>
                <Th>Destino</Th>
                <Th className="w-[220px]">URL del chip</Th>
                <Th className="w-[90px] text-right">Escaneos</Th>
                <Th className="w-[140px]">Último</Th>
              </tr>
            </Thead>
            <tbody>
              {bracelets.map((bracelet) => {
                const url = braceletUrl(bracelet.code);
                return (
                  <Tr key={bracelet.id} className={bracelet.active ? undefined : "opacity-60"}>
                    <Td>
                      <span className="font-mono text-xs font-medium text-ex-text">
                        {bracelet.code}
                      </span>
                    </Td>
                    <Td className="text-xs">{bracelet.label ?? "—"}</Td>
                    <Td className="max-w-0">
                      <span
                        className="block truncate font-mono text-[11px]"
                        title={bracelet.destinationUrl}
                      >
                        {bracelet.destinationUrl}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span
                          className="min-w-0 flex-1 truncate font-mono text-[11px] text-ex-text-muted"
                          title={url}
                        >
                          {url}
                        </span>
                        <CopyButton value={url} />
                      </div>
                    </Td>
                    <Td className="num text-right text-sm text-ex-text">
                      {formatNumber(bracelet.scanCount)}
                    </Td>
                    <Td className="num text-[11px]">{formatDateTime(bracelet.lastScanAt)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardBody>
        {/* El número pesa más que su etiqueta y va primero. */}
        <p className="ex-metric">{value}</p>
        <p className="ex-label mt-1.5">{label}</p>
      </CardBody>
    </Card>
  );
}
