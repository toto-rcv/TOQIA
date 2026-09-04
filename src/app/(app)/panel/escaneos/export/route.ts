import { getTranslations } from "next-intl/server";
import type { NextRequest } from "next/server";

import { listLocationOptions } from "@/db/queries/locations";
import { listScansForExport } from "@/db/queries/scans";
import { parseScanFilters, scansToCsv, type RawScanParams } from "@/lib/scan-params";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export CSV de los escaneos del restaurante.
 *
 * Este handler no pasa por el layout de /panel, así que verifica la sesión y
 * el rol por su cuenta, y vuelve a imponer el accountId de la sesión sobre
 * cualquier cosa que venga en la query string.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();

  if (!user || user.role !== "restaurant" || user.accountId === null) {
    const t = await getTranslations("Errores");
    return new Response(t("noAutorizado"), { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const params: RawScanParams = {
    local: searchParams.get("local") ?? undefined,
    pulsera: searchParams.get("pulsera") ?? undefined,
    camarero: searchParams.get("camarero") ?? undefined,
    convertidos: searchParams.get("convertidos") ?? undefined,
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
  };

  try {
    const filters = parseScanFilters(params);

    // El local pedido tiene que ser de esta cuenta.
    if (filters.locationId) {
      const locations = await listLocationOptions(user.accountId);
      if (!locations.some((item) => item.id === filters.locationId)) {
        delete filters.locationId;
      }
    }
    filters.accountId = user.accountId;

    const rows = await listScansForExport(filters);
    const csv = scansToCsv(rows, { includeAccount: false });
    const nombre = `escaneos-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[panel/export] no se pudo generar el CSV", error);
    const t = await getTranslations("Errores");
    return new Response(t("csvFallido"), { status: 500 });
  }
}
