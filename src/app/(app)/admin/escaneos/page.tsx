import { getLocale, getTranslations } from "next-intl/server";

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

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Escaneos");
  return { title: t("titulo") };
}
export const dynamic = "force-dynamic";


export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<RawScanParams>;
}) {
  await requireAdmin();
  const [params, t, locale] = await Promise.all([
    searchParams,
    getTranslations("Escaneos"),
    getLocale(),
  ]);
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
        title={t("titulo")}
        subtitle={
          escaneos.total === 1
            ? t("subtituloSingular", { n: formatNumber(escaneos.total, locale) })
            : t("subtituloPlural", { n: formatNumber(escaneos.total, locale) })
        }
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
