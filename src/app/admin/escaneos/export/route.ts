import type { NextRequest } from "next/server";

import { listScansForExport } from "@/db/queries/scans";
import { parseScanFilters, scansToCsv, type RawScanParams } from "@/lib/scan-params";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export CSV global.
 * No pasa por el layout de /admin, así que verifica el rol por su cuenta.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return new Response("No autorizado", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const params: RawScanParams = {
    cuenta: searchParams.get("cuenta") ?? undefined,
    local: searchParams.get("local") ?? undefined,
    pulsera: searchParams.get("pulsera") ?? undefined,
    camarero: searchParams.get("camarero") ?? undefined,
    convertidos: searchParams.get("convertidos") ?? undefined,
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
  };

  try {
    const filters = parseScanFilters(params);

    const cuentaId = params.cuenta ? Number.parseInt(params.cuenta, 10) : NaN;
    if (Number.isFinite(cuentaId)) filters.accountId = cuentaId;

    const rows = await listScansForExport(filters);
    const csv = scansToCsv(rows, { includeAccount: true });
    const nombre = `escaneos-toqia-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[admin/export] no se pudo generar el CSV", error);
    return new Response("No se pudo generar el CSV. Revisá los logs.", {
      status: 500,
    });
  }
}
