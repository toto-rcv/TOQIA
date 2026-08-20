import type { NextRequest } from "next/server";

import { listScansForExport } from "@/db/queries/scans";
import { getSession } from "@/lib/session";
import { parseScanFilters, type RawScanParams } from "../filter-params";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exporta a CSV los escaneos que coinciden con los filtros de la query string.
 * Usa exactamente los mismos parámetros que la tabla, así lo que se descarga
 * es siempre lo que se está viendo.
 */
export async function GET(request: NextRequest) {
  // Este handler no pasa por el layout de /admin, así que verifica la sesión
  // por su cuenta.
  const session = await getSession();
  if (!session) {
    return new Response("No autorizado", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const params: RawScanParams = {
    restaurant: searchParams.get("restaurant") ?? undefined,
    bracelet: searchParams.get("bracelet") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  try {
    const rows = await listScansForExport(parseScanFilters(params));

    const encabezado = [
      "id",
      "fecha_utc",
      "fecha_local",
      "pulsera",
      "etiqueta",
      "restaurante",
      "user_agent",
      "ip_hash",
    ];

    const lineas = [encabezado.join(",")];

    for (const row of rows) {
      lineas.push(
        [
          row.id,
          row.scannedAt.toISOString(),
          formatLocal(row.scannedAt),
          row.braceletCode,
          row.braceletLabel ?? "",
          row.restaurantName,
          row.userAgent ?? "",
          row.ipHash ?? "",
        ]
          .map(csvCell)
          .join(",")
      );
    }

    // El BOM hace que Excel abra el archivo como UTF-8 y no rompa los acentos.
    const csv = `﻿${lineas.join("\r\n")}\r\n`;
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
    console.error("[scans/export] no se pudo generar el CSV", error);
    return new Response("No se pudo generar el CSV. Revisá los logs.", {
      status: 500,
    });
  }
}

function formatLocal(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/**
 * Escapa una celda de CSV.
 *
 * Además de las comillas y los saltos de línea, prefijamos con comilla simple
 * cualquier valor que arranque con =, +, - o @: sin eso, Excel lo interpreta
 * como fórmula y un user agent malicioso podría ejecutar algo al abrir el
 * archivo (CSV injection).
 */
function csvCell(value: string | number): string {
  let text = String(value ?? "");

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
