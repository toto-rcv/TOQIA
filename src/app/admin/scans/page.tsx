import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listBracelets } from "@/db/queries/bracelets";
import { listRestaurantOptions } from "@/db/queries/restaurants";
import { listScans } from "@/db/queries/scans";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { parsePage, parseScanFilters, type RawScanParams } from "./filter-params";
import { ScanFilters } from "./filters";

export const metadata = { title: "Escaneos · Panel" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ScansPage({
  searchParams,
}: {
  searchParams: Promise<RawScanParams>;
}) {
  const params = await searchParams;
  const filters = parseScanFilters(params);
  const page = parsePage(params.page);

  const [{ rows, total }, restaurants, bracelets] = await Promise.all([
    listScans(filters, { page, pageSize: PAGE_SIZE }),
    listRestaurantOptions(),
    listBracelets({}),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPages);

  return (
    <>
      <PageHeader
        title="Escaneos"
        subtitle={`${formatNumber(total)} ${total === 1 ? "registro" : "registros"} con los filtros aplicados.`}
      />

      <ScanFilters
        restaurants={restaurants}
        bracelets={bracelets.map((item) => ({
          id: item.id,
          code: item.code,
          restaurantId: item.restaurantId,
        }))}
      />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState>No hay escaneos que coincidan con estos filtros.</EmptyState>
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th className="w-[160px]">Fecha y hora</Th>
                  <Th className="w-[110px]">Pulsera</Th>
                  <Th className="w-[160px]">Etiqueta</Th>
                  <Th className="w-[200px]">Restaurante</Th>
                  <Th>User agent</Th>
                  <Th className="w-[110px]">IP (hash)</Th>
                </tr>
              </Thead>
              <tbody>
                {rows.map((scan) => (
                  <Tr key={scan.id}>
                    <Td className="num text-xs text-ex-text">
                      {formatDateTime(scan.scannedAt)}
                    </Td>
                    <Td className="font-mono text-xs text-ex-text">
                      {scan.braceletCode}
                    </Td>
                    <Td className="text-xs">{scan.braceletLabel ?? "—"}</Td>
                    <Td className="text-xs">{scan.restaurantName}</Td>
                    <Td className="max-w-0">
                      <span
                        className="block truncate text-[11px] text-ex-text-muted"
                        title={scan.userAgent ?? undefined}
                      >
                        {scan.userAgent ?? "—"}
                      </span>
                    </Td>
                    <Td className="font-mono text-[11px] text-ex-text-disabled">
                      {/* Se muestran solo los primeros caracteres: alcanza para
                          distinguir visitantes y no invita a jugar con el hash. */}
                      {scan.ipHash ? `${scan.ipHash.slice(0, 10)}…` : "—"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <Paginacion
              page={paginaActual}
              totalPages={totalPages}
              params={params}
              total={total}
            />
          </>
        )}
      </Card>
    </>
  );
}

function Paginacion({
  page,
  totalPages,
  params,
  total,
}: {
  page: number;
  totalPages: number;
  params: RawScanParams;
  total: number;
}) {
  function href(nextPage: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== "page" && value) query.set(key, value);
    }
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/admin/scans?${qs}` : "/admin/scans";
  }

  const desde = (page - 1) * 50 + 1;
  const hasta = Math.min(page * 50, total);

  return (
    <div className="flex items-center justify-between border-t border-ex-border px-4 py-3">
      <p className="font-mono text-[11px] text-ex-text-muted">
        {formatNumber(desde)}–{formatNumber(hasta)} de {formatNumber(total)}
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="ex-btn-ghost">
            Anterior
          </Link>
        ) : (
          <span className="ex-btn-ghost pointer-events-none opacity-40">Anterior</span>
        )}

        <span className="font-mono text-[11px] text-ex-text-muted">
          {page} / {totalPages}
        </span>

        {page < totalPages ? (
          <Link href={href(page + 1)} className="ex-btn-ghost">
            Siguiente
          </Link>
        ) : (
          <span className="ex-btn-ghost pointer-events-none opacity-40">Siguiente</span>
        )}
      </div>
    </div>
  );
}
