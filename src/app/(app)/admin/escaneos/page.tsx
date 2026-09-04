import { AccountFilter } from "@/components/admin/account-filter";
import { PageHeader } from "@/components/admin/page-header";
import { ScanFiltersBar } from "@/components/stats/scan-filters";
import { ScansTable } from "@/components/stats/scans-table";
import { listAccountOptions } from "@/db/queries/accounts";
import { listBraceletOptions } from "@/db/queries/bracelets";
import { listLocations } from "@/db/queries/locations";
import { listScans } from "@/db/queries/scans";
import { listWaiterOptions } from "@/db/queries/waiters";
import { parsePageParams } from "@/lib/pagination";
import { parseScanFilters, type RawScanParams } from "@/lib/scan-params";
import { requireAdmin } from "@/lib/session";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Escaneos · Toqia Admin" };
export const dynamic = "force-dynamic";


export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<RawScanParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const pagina = parsePageParams(params);

  const cuentaId = params.cuenta ? Number.parseInt(params.cuenta, 10) : NaN;
  const filtroCuenta = Number.isFinite(cuentaId) ? cuentaId : undefined;

  const filters = parseScanFilters(params);
  if (filtroCuenta) filters.accountId = filtroCuenta;

  const [escaneos, locales, pulseras, cuentas] = await Promise.all([
    listScans(filters, pagina),
    listLocations({ accountId: filtroCuenta }),
    listBraceletOptions({ accountId: filtroCuenta }),
    listAccountOptions(),
  ]);

  const camareros = await listWaiterOptions(locales.map((item) => item.id));

  return (
    <>
      <PageHeader
        title="Escaneos"
        subtitle={`${formatNumber(escaneos.total)} ${escaneos.total === 1 ? "registro" : "registros"} con los filtros aplicados.`}
      >
        <AccountFilter accounts={cuentas} />
      </PageHeader>

      <ScanFiltersBar
        locations={locales.map((item) => ({ id: item.id, name: item.name }))}
        bracelets={pulseras}
        waiters={camareros}
        exportPath="/admin/escaneos/export"
      />

      <ScansTable
        paged={escaneos}
        basePath="/admin/escaneos"
        searchParams={params as Record<string, string | undefined>}
        showAccount
      />
    </>
  );
}
