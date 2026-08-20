import { AccountFilter } from "@/components/admin/account-filter";
import { PageHeader } from "@/components/admin/page-header";
import { ScanFiltersBar } from "@/components/stats/scan-filters";
import { ScansTable } from "@/components/stats/scans-table";
import { listAccountOptions } from "@/db/queries/accounts";
import { listBracelets } from "@/db/queries/bracelets";
import { listLocations } from "@/db/queries/locations";
import { listScans } from "@/db/queries/scans";
import { listWaiterOptions } from "@/db/queries/waiters";
import { parsePage, parseScanFilters, type RawScanParams } from "@/lib/scan-params";
import { requireAdmin } from "@/lib/session";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Escaneos · Toqia Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<RawScanParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = parsePage(params.page);

  const cuentaId = params.cuenta ? Number.parseInt(params.cuenta, 10) : NaN;
  const filtroCuenta = Number.isFinite(cuentaId) ? cuentaId : undefined;

  const filters = parseScanFilters(params);
  if (filtroCuenta) filters.accountId = filtroCuenta;

  const [{ rows, total }, locales, pulseras, cuentas] = await Promise.all([
    listScans(filters, { page, pageSize: PAGE_SIZE }),
    listLocations({ accountId: filtroCuenta }),
    listBracelets({ accountId: filtroCuenta }),
    listAccountOptions(),
  ]);

  const camareros = await listWaiterOptions(locales.map((item) => item.id));

  return (
    <>
      <PageHeader
        title="Escaneos"
        subtitle={`${formatNumber(total)} ${total === 1 ? "registro" : "registros"} con los filtros aplicados.`}
      >
        <AccountFilter accounts={cuentas} />
      </PageHeader>

      <ScanFiltersBar
        locations={locales.map((item) => ({ id: item.id, name: item.name }))}
        bracelets={pulseras.map((item) => ({
          id: item.id,
          code: item.code,
          locationId: item.locationId,
        }))}
        waiters={camareros}
        exportPath="/admin/escaneos/export"
      />

      <ScansTable
        rows={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        basePath="/admin/escaneos"
        searchParams={params as Record<string, string | undefined>}
        showAccount
      />
    </>
  );
}
