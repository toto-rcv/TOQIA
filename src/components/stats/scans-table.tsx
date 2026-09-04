import { Check, Minus, ScanLine } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  EmptyState,
  RowCard,
  RowField,
  RowFields,
  Table,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui/table";
import type { ScanRow } from "@/db/queries/scans";
import type { Paged } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";

/**
 * Tabla paginada de escaneos. La comparten /panel y /admin.
 *
 * Las filas que llegan son exactamente las de la página pedida: el LIMIT lo
 * aplicó la base (ver `listScans`). Acá no se filtra ni se recorta nada.
 */
import { useTranslations } from "next-intl";

export function ScansTable({
  paged,
  basePath,
  searchParams,
  showAccount = false,
  showLocation = true,
}: {
  paged: Paged<ScanRow>;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  showAccount?: boolean;
  showLocation?: boolean;
}) {
  const t = useTranslations("Escaneos");

  if (paged.data.length === 0) {
    return (
      <Card>
        <EmptyState icon={<ScanLine className="size-6" />}>
          {t("sinCoincidencias")}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* ── Escritorio ───────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <Table>
          <Thead>
            <tr>
              <Th className="w-[165px]">{t("colFechaHora")}</Th>
              <Th className="w-[110px]">{t("colPulsera")}</Th>
              <Th className="w-[150px]">{t("colCamarero")}</Th>
              {showAccount ? <Th className="w-[160px]">{t("colCuenta")}</Th> : null}
              {showLocation ? <Th className="w-[160px]">{t("colLocal")}</Th> : null}
              <Th className="w-[90px] text-center">{t("colResena")}</Th>
              <Th>{t("colDispositivo")}</Th>
              <Th className="w-[120px]">{t("colIp")}</Th>
            </tr>
          </Thead>
          <tbody>
            {paged.data.map((scan) => (
              <Tr key={scan.id}>
                <Td className="text-[13px] tabular-nums text-ex-text">
                  {formatDateTime(scan.scannedAt)}
                </Td>
                <Td className="font-mono text-[13px] font-medium text-ex-text">
                  {scan.braceletCode}
                </Td>
                <Td className="text-[13px]">{scan.waiterName ?? "—"}</Td>
                {showAccount ? (
                  <Td className="text-[13px]">{scan.accountName}</Td>
                ) : null}
                {showLocation ? (
                  <Td className="text-[13px]">{scan.locationName}</Td>
                ) : null}
                <Td className="text-center">
                  <MarcaDeResena scan={scan} />
                </Td>
                <Td className="max-w-0">
                  <span
                    className="block truncate text-[12px] text-ex-text-muted"
                    title={scan.userAgent ?? undefined}
                  >
                    {dispositivo(scan.userAgent)}
                  </span>
                </Td>
                <Td className="font-mono text-[11.5px] text-ex-text-disabled">
                  {/* Solo los primeros caracteres: alcanza para distinguir
                      visitantes y no invita a jugar con el hash completo. */}
                  {scan.ipHash ? `${scan.ipHash.slice(0, 10)}…` : "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* ── Celular y tablet ─────────────────────────────────────────── */}
      <ul className="lg:hidden">
        {paged.data.map((scan) => (
          <RowCard key={scan.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold tabular-nums text-ex-text">
                  {formatDateTime(scan.scannedAt)}
                </p>
                <p className="mt-0.5 font-mono text-[12.5px] text-ex-text-muted">
                  {scan.braceletCode}
                  {showLocation ? ` · ${scan.locationName}` : ""}
                </p>
              </div>
              <MarcaDeResena scan={scan} conTexto />
            </div>

            <RowFields>
              <RowField label={t("colCamarero")}>{scan.waiterName ?? "—"}</RowField>
              <RowField label={t("colDispositivo")}>
                <span className="block truncate">
                  {dispositivo(scan.userAgent)}
                </span>
              </RowField>
            </RowFields>
          </RowCard>
        ))}
      </ul>

      <Pagination
        paged={paged}
        basePath={basePath}
        searchParams={searchParams}
        itemLabel={t("itemLabel")}
      />
    </Card>
  );
}

function MarcaDeResena({
  scan,
  conTexto = false,
}: {
  scan: ScanRow;
  conTexto?: boolean;
}) {
  const t = useTranslations("Escaneos");

  if (scan.reviewClickedAt) {
    return (
      <span
        title={t("fueAResenaEl", { fecha: formatDateTime(scan.reviewClickedAt) })}
        className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-ex-success/12
                   px-2 py-1 text-[11px] font-semibold text-ex-success"
      >
        <Check className="size-3.5" aria-hidden />
        {conTexto ? t("resenaSi") : <span className="sr-only">{t("fueAResena")}</span>}
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-ex-elevated
                 px-2 py-1 text-[11px] font-medium text-ex-text-disabled"
    >
      <Minus className="size-3.5" aria-hidden />
      {conTexto ? t("resenaNo") : <span className="sr-only">{t("resenaNo")}</span>}
    </span>
  );
}

/**
 * El user agent completo no le dice nada a un dueño de restaurante. Se reduce
 * al sistema y al navegador, que es lo único accionable ("mis clientes entran
 * casi todos desde iPhone").
 */
function dispositivo(userAgent: string | null): string {
  if (!userAgent) return "—";

  const sistema = /iPhone|iPad|iPod/i.test(userAgent)
    ? "iPhone"
    : /Android/i.test(userAgent)
      ? "Android"
      : /Windows/i.test(userAgent)
        ? "Windows"
        : /Mac OS X/i.test(userAgent)
          ? "Mac"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "Otro";

  const navegador = /Edg\//i.test(userAgent)
    ? "Edge"
    : /Chrome\//i.test(userAgent)
      ? "Chrome"
      : /Firefox\//i.test(userAgent)
        ? "Firefox"
        : /Safari\//i.test(userAgent)
          ? "Safari"
          : null;

  return navegador ? `${sistema} · ${navegador}` : sistema;
}
