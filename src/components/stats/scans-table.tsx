import Link from "next/link";
import { Check, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { ScanRow } from "@/db/queries/scans";
import { formatDateTime, formatNumber } from "@/lib/utils";

/** Tabla paginada de escaneos. La comparten /panel y /admin. */
export function ScansTable({
  rows,
  total,
  page,
  pageSize,
  basePath,
  searchParams,
  showAccount = false,
  showLocation = true,
}: {
  rows: ScanRow[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
  showAccount?: boolean;
  showLocation?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginaActual = Math.min(page, totalPages);

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState>No hay escaneos que coincidan con estos filtros.</EmptyState>
      </Card>
    );
  }

  function href(nextPage: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key !== "page" && value) query.set(key, value);
    }
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const desde = (paginaActual - 1) * pageSize + 1;
  const hasta = Math.min(paginaActual * pageSize, total);

  return (
    <Card className="overflow-hidden">
      <Table>
        <Thead>
          <tr>
            <Th className="w-[160px]">Fecha y hora</Th>
            <Th className="w-[100px]">Pulsera</Th>
            <Th className="w-[150px]">Camarero</Th>
            {showAccount ? <Th className="w-[160px]">Cuenta</Th> : null}
            {showLocation ? <Th className="w-[160px]">Local</Th> : null}
            <Th className="w-[90px] text-center">Reseña</Th>
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
              <Td className="font-mono text-xs text-ex-text">{scan.braceletCode}</Td>
              <Td className="text-xs">{scan.waiterName ?? "—"}</Td>
              {showAccount ? <Td className="text-xs">{scan.accountName}</Td> : null}
              {showLocation ? <Td className="text-xs">{scan.locationName}</Td> : null}
              <Td className="text-center">
                {scan.reviewClickedAt ? (
                  <span
                    title={`Fue a la reseña el ${formatDateTime(scan.reviewClickedAt)}`}
                    className="inline-flex items-center justify-center text-ex-success"
                  >
                    <Check className="size-4" />
                  </span>
                ) : (
                  <Minus className="inline-block size-4 text-ex-text-disabled" />
                )}
              </Td>
              <Td className="max-w-0">
                <span
                  className="block truncate text-[11px] text-ex-text-muted"
                  title={scan.userAgent ?? undefined}
                >
                  {scan.userAgent ?? "—"}
                </span>
              </Td>
              <Td className="font-mono text-[11px] text-ex-text-disabled">
                {/* Solo los primeros caracteres: alcanza para distinguir
                    visitantes y no invita a jugar con el hash completo. */}
                {scan.ipHash ? `${scan.ipHash.slice(0, 10)}…` : "—"}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <div className="flex items-center justify-between border-t border-ex-border px-4 py-3">
        <p className="font-mono text-[11px] text-ex-text-muted">
          {formatNumber(desde)}–{formatNumber(hasta)} de {formatNumber(total)}
        </p>

        <div className="flex items-center gap-2">
          {paginaActual > 1 ? (
            <Link href={href(paginaActual - 1)} className="ex-btn-ghost">
              Anterior
            </Link>
          ) : (
            <span className="ex-btn-ghost pointer-events-none opacity-40">Anterior</span>
          )}

          <span className="font-mono text-[11px] text-ex-text-muted">
            {paginaActual} / {totalPages}
          </span>

          {paginaActual < totalPages ? (
            <Link href={href(paginaActual + 1)} className="ex-btn-ghost">
              Siguiente
            </Link>
          ) : (
            <span className="ex-btn-ghost pointer-events-none opacity-40">Siguiente</span>
          )}
        </div>
      </div>
    </Card>
  );
}
