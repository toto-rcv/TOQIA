import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { RestaurantFilter } from "@/components/admin/restaurant-filter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listBracelets } from "@/db/queries/bracelets";
import { listRestaurantOptions } from "@/db/queries/restaurants";
import { braceletUrl, formatDateTime, formatNumber } from "@/lib/utils";
import { BraceletRowActions } from "./bracelet-row-actions";
import { BulkCreateDialog, NewBraceletDialog } from "./create-dialogs";
import { DestinationCell } from "./destination-cell";

export const metadata = { title: "Pulseras · Panel" };
export const dynamic = "force-dynamic";

export default async function BraceletsPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurant?: string }>;
}) {
  const { restaurant } = await searchParams;
  const restaurantId = restaurant ? Number.parseInt(restaurant, 10) : undefined;
  const filtroValido =
    restaurantId !== undefined && Number.isFinite(restaurantId)
      ? restaurantId
      : undefined;

  const [bracelets, restaurants] = await Promise.all([
    listBracelets({ restaurantId: filtroValido }),
    listRestaurantOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Pulseras"
        subtitle="La URL grabada en el chip nunca cambia. Lo que cambia es el destino."
      >
        <RestaurantFilter restaurants={restaurants} />
        <NewBraceletDialog
          restaurants={restaurants}
          defaultRestaurantId={filtroValido}
        />
        <BulkCreateDialog
          restaurants={restaurants}
          defaultRestaurantId={filtroValido}
        />
      </PageHeader>

      {restaurants.length === 0 ? (
        <Card>
          <EmptyState>
            Todavía no hay restaurantes.{" "}
            <Link
              href="/admin/restaurants"
              className="text-ex-blue-bright underline underline-offset-4"
            >
              Creá el primero
            </Link>{" "}
            para poder cargar pulseras.
          </EmptyState>
        </Card>
      ) : bracelets.length === 0 ? (
        <Card>
          <EmptyState>
            No hay pulseras{filtroValido ? " para este restaurante" : ""}. Usá
            &ldquo;Alta masiva&rdquo; para generar una tanda completa.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th className="w-[110px]">Código</Th>
                <Th className="w-[150px]">Etiqueta</Th>
                <Th className="w-[170px]">Restaurante</Th>
                <Th>Destino</Th>
                <Th className="w-[220px]">URL del chip</Th>
                <Th className="w-[90px] text-right">Escaneos</Th>
                <Th className="w-[140px]">Último</Th>
                <Th className="w-[90px] text-right">Acciones</Th>
              </tr>
            </Thead>
            <tbody>
              {bracelets.map((bracelet) => {
                const url = braceletUrl(bracelet.code);
                const inactivo = !bracelet.active || !bracelet.restaurantActive;

                return (
                  <Tr key={bracelet.id} className={inactivo ? "opacity-60" : undefined}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-ex-text">
                          {bracelet.code}
                        </span>
                        {!bracelet.active ? (
                          <Badge tone="inactive">off</Badge>
                        ) : null}
                        {bracelet.active && !bracelet.restaurantActive ? (
                          <Badge tone="warning" title="El restaurante está desactivado">
                            rest. off
                          </Badge>
                        ) : null}
                      </div>
                    </Td>

                    <Td className="text-xs">{bracelet.label ?? "—"}</Td>

                    <Td className="text-xs">
                      <Link
                        href={`/admin/restaurants/${bracelet.restaurantId}`}
                        className="transition-colors hover:text-ex-text"
                      >
                        {bracelet.restaurantName}
                      </Link>
                    </Td>

                    <Td className="max-w-0">
                      <DestinationCell
                        braceletId={bracelet.id}
                        value={bracelet.destinationUrl}
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

                    <Td className="text-right">
                      <span className="num text-sm text-ex-text">
                        {formatNumber(bracelet.scanCount)}
                      </span>
                    </Td>

                    <Td className="num text-[11px]">
                      {formatDateTime(bracelet.lastScanAt)}
                    </Td>

                    <Td>
                      <BraceletRowActions
                        bracelet={bracelet}
                        restaurants={restaurants}
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
