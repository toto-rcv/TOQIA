import { PageHeader } from "@/components/admin/page-header";
import { ScanFiltersBar } from "@/components/stats/scan-filters";
import { ScansTable } from "@/components/stats/scans-table";
import { listBraceletOptions } from "@/db/queries/bracelets";
import { listLocationOptions } from "@/db/queries/locations";
import { listScans } from "@/db/queries/scans";
import { listWaiterOptions } from "@/db/queries/waiters";
import { parsePageParams } from "@/lib/pagination";
import { parseScanFilters, type RawScanParams } from "@/lib/scan-params";
import { requireRestaurantUser } from "@/lib/session";
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

import { getLocale, getTranslations } from "next-intl/server";

export default async function PanelScansPage({
  searchParams,
}: {
  searchParams: Promise<RawScanParams>;
}) {
  const [user, t, locale] = await Promise.all([
    requireRestaurantUser(),
    getTranslations("Escaneos"),
    getLocale(),
  ]);
  const params = await searchParams;
  const pagina = parsePageParams(params);

  const locations = await listLocationOptions(user.accountId);
  const locationIds = new Set(locations.map((item) => item.id));

  // Los filtros del usuario se aceptan, pero el accountId lo impone el
  // servidor: sin esto, cambiar un número en la URL mostraría datos ajenos.
  const filters = parseScanFilters(params);
  if (filters.locationId && !locationIds.has(filters.locationId)) {
    delete filters.locationId;
  }
  filters.accountId = user.accountId;

  const [escaneos, bracelets, waiters] = await Promise.all([
    listScans(filters, pagina),
    // Solo id + código: llenar el desplegable no justifica traer los
    // agregados de cada pulsera.
    listBraceletOptions({ accountId: user.accountId }),
    listWaiterOptions([...locationIds]),
  ]);

  const subtituloKey = escaneos.total === 1 ? "subtituloSingular" : "subtituloPlural";

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={t(subtituloKey, { n: formatNumber(escaneos.total, locale) })}
      />

      <ScanFiltersBar
        locations={locations}
        bracelets={bracelets}
        waiters={waiters}
        exportPath="/panel/escaneos/export"
      />

      <ScansTable
        paged={escaneos}
        basePath="/panel/escaneos"
        searchParams={params as Record<string, string | undefined>}
        showLocation={locations.length > 1}
      />
    </>
  );
}
