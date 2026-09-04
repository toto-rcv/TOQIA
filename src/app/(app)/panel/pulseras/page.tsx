import { Nfc } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
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
import { listBracelets } from "@/db/queries/bracelets";
import { listLocationOptions } from "@/db/queries/locations";
import { listWaiterOptions } from "@/db/queries/waiters";
import { parsePageParams, type RawPageParams } from "@/lib/pagination";
import { requireRestaurantUser } from "@/lib/session";
import { braceletUrl, formatDateTime, formatNumber } from "@/lib/utils";
import { WaiterSelect } from "./waiter-select";

export const metadata = { title: "Pulseras · Toqia" };
export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";

export default async function PanelBraceletsPage({
  searchParams,
}: {
  searchParams: Promise<RawPageParams>;
}) {
  const [user, t] = await Promise.all([
    requireRestaurantUser(),
    getTranslations("Pulseras"),
  ]);
  const params = await searchParams;

  // La página que se pide viaja hasta el SQL: la base devuelve diez filas,
  // no todas las de la cuenta. Ver src/lib/pagination.ts.
  const pagina = parsePageParams(params);

  const [pulseras, locations] = await Promise.all([
    listBracelets({ accountId: user.accountId }, pagina),
    listLocationOptions(user.accountId),
  ]);

  const waiters = await listWaiterOptions(locations.map((item) => item.id));
  const variosLocales = locations.length > 1;

  // La pulsera puede no tener local si está en stock. Acá no debería pasar
  // —el listado va filtrado por cuenta— pero un desplegable vacío es mejor
  // final que una excepción en la página del restaurante.
  const camarerosDe = (locationId: number | null) =>
    locationId === null
      ? []
      : waiters.filter((camarero) => camarero.locationId === locationId);

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={t("subtitulo")}
      />

      {pulseras.total === 0 ? (
        <Card>
          <EmptyState icon={<Nfc className="size-6" />}>
            {t("sinPulseras")}
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* ── Escritorio ─────────────────────────────────────────────── */}
          <div className="hidden lg:block">
            <Table>
              <Thead>
                <tr>
                  <Th className="w-[120px]">{t("colCodigo")}</Th>
                  <Th className="w-[150px]">{t("colEtiqueta")}</Th>
                  {variosLocales ? <Th className="w-[150px]">{t("colLocal")}</Th> : null}
                  <Th className="w-[190px]">{t("colCamarero")}</Th>
                  <Th>{t("colUrlChip")}</Th>
                  <Th className="w-[90px] text-right">{t("colEscaneos")}</Th>
                  <Th className="w-[90px] text-right">{t("colResenas")}</Th>
                  <Th className="w-[140px]">{t("colUltimo")}</Th>
                </tr>
              </Thead>
              <tbody>
                {pulseras.data.map((pulsera) => {
                  const url = braceletUrl(pulsera.code);
                  const inactiva = !pulsera.active || !pulsera.locationActive;

                  return (
                    <Tr
                      key={pulsera.id}
                      className={inactiva ? "opacity-60" : undefined}
                    >
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-medium text-ex-text">
                            {pulsera.code}
                          </span>
                          {!pulsera.active ? (
                            <Badge tone="inactive">{t("off")}</Badge>
                          ) : null}
                        </div>
                      </Td>

                      <Td className="text-[13px]">{pulsera.label ?? "—"}</Td>

                      {variosLocales ? (
                        <Td className="text-[13px]">{pulsera.locationName}</Td>
                      ) : null}

                      <Td>
                        <WaiterSelect
                          braceletId={pulsera.id}
                          waiterId={pulsera.waiterId}
                          waiters={camarerosDe(pulsera.locationId)}
                        />
                      </Td>

                      <Td>
                        <div className="flex items-center gap-2">
                          <span
                            className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ex-text-muted"
                            title={url}
                          >
                            {url}
                          </span>
                          <CopyButton value={url} label={t("copiarUrl")} />
                        </div>
                      </Td>

                      <Td className="text-right text-sm font-medium tabular-nums text-ex-text">
                        {formatNumber(pulsera.scanCount)}
                      </Td>

                      <Td className="text-right text-sm tabular-nums">
                        {formatNumber(pulsera.reviewClicks)}
                      </Td>

                      <Td className="text-[12px] tabular-nums">
                        {formatDateTime(pulsera.lastScanAt)}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* ── Celular y tablet ───────────────────────────────────────── */}
          <ul className="lg:hidden">
            {pulseras.data.map((pulsera) => {
              const url = braceletUrl(pulsera.code);
              const inactiva = !pulsera.active || !pulsera.locationActive;

              return (
                <RowCard
                  key={pulsera.id}
                  className={inactiva ? "opacity-60" : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-mono text-[15px] font-semibold text-ex-text">
                        {pulsera.code}
                        {!pulsera.active ? (
                          <Badge tone="inactive">{t("off")}</Badge>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-ex-text-muted">
                        {pulsera.label ?? (variosLocales ? pulsera.locationName : t("sinEtiqueta"))}
                      </p>
                    </div>

                    <CopyButton
                      value={url}
                      label={t("copiarUrl")}
                      className="h-9 w-9 shrink-0"
                    />
                  </div>

                  <div className="mt-3">
                    <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ex-text-muted">
                      {t("colCamarero")}
                    </p>
                    <WaiterSelect
                      braceletId={pulsera.id}
                      waiterId={pulsera.waiterId}
                      waiters={camarerosDe(pulsera.locationId)}
                    />
                  </div>

                  <RowFields className="grid-cols-3">
                    <RowField label={t("colEscaneos")}>
                      <span className="font-semibold tabular-nums text-ex-text">
                        {formatNumber(pulsera.scanCount)}
                      </span>
                    </RowField>
                    <RowField label={t("colResenas")}>
                      <span className="tabular-nums">
                        {formatNumber(pulsera.reviewClicks)}
                      </span>
                    </RowField>
                    <RowField label={t("colUltimo")}>
                      <span className="text-[12px] tabular-nums">
                        {formatDateTime(pulsera.lastScanAt)}
                      </span>
                    </RowField>
                  </RowFields>
                </RowCard>
              );
            })}
          </ul>

          <Pagination
            paged={pulseras}
            basePath="/panel/pulseras"
            searchParams={params}
            itemLabel={t("itemLabel")}
          />
        </Card>
      )}
    </>
  );
}
