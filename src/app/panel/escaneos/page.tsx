import { PageHeader } from "@/components/admin/page-header";
import { ScanFiltersBar } from "@/components/stats/scan-filters";
import { ScansTable } from "@/components/stats/scans-table";
import { listBracelets } from "@/db/queries/bracelets";
import { listLocationOptions } from "@/db/queries/locations";
import { listScans } from "@/db/queries/scans";
import { listWaiterOptions } from "@/db/queries/waiters";
import { parsePage, parseScanFilters, type RawScanParams } from "@/lib/scan-params";
import { requireRestaurantUser } from "@/lib/session";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Escaneos · Toqia" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function PanelScansPage({
  searchParams,
}: {
  searchParams: Promise<RawScanParams>;
}) {
  const user = await requireRestaurantUser();
  const params = await searchParams;
  const page = parsePage(params.page);

  const locations = await listLocationOptions(user.accountId);
  const locationIds = new Set(locations.map((item) => item.id));

  // Los filtros del usuario se aceptan, pero el accountId lo impone el
  // servidor: sin esto, cambiar un número en la URL mostraría datos ajenos.
  const filters = parseScanFilters(params);
  if (filters.locationId && !locationIds.has(filters.locationId)) {
    delete filters.locationId;
  }
  filters.accountId = user.accountId;

  const [{ rows, total }, bracelets, waiters] = await Promise.all([
    listScans(filters, { page, pageSize: PAGE_SIZE }),
    listBracelets({ accountId: user.accountId }),
    listWaiterOptions([...locationIds]),
  ]);

  return (
    <>
      <PageHeader
        title="Escaneos"
        subtitle={`${formatNumber(total)} ${total === 1 ? "registro" : "registros"} con los filtros aplicados.`}
      />

      <ScanFiltersBar
        locations={locations}
        bracelets={bracelets.map((item) => ({
          id: item.id,
          code: item.code,
          locationId: item.locationId,
        }))}
        waiters={waiters}
        exportPath="/panel/escaneos/export"
      />

      <ScansTable
        rows={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        basePath="/panel/escaneos"
        searchParams={params as Record<string, string | undefined>}
        showLocation={locations.length > 1}
      />
    </>
  );
}
