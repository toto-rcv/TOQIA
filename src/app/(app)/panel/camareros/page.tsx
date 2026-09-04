import { Users } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
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
import { listLocationOptions } from "@/db/queries/locations";
import { listWaiters } from "@/db/queries/waiters";
import { parsePageParams, type RawPageParams } from "@/lib/pagination";
import { requireRestaurantUser } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";
import { NewWaiterDialog, WaiterRowActions } from "./waiter-dialogs";

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Camareros");
  return { title: t("titulo") };
}
export const dynamic = "force-dynamic";

import { getLocale, getTranslations } from "next-intl/server";

export default async function PanelWaitersPage({
  searchParams,
}: {
  searchParams: Promise<RawPageParams>;
}) {
  const [user, t, locale] = await Promise.all([
    requireRestaurantUser(),
    getTranslations("Camareros"),
    getLocale(),
  ]);
  const params = await searchParams;
  const pagina = parsePageParams(params);

  const [camareros, locations] = await Promise.all([
    listWaiters({ accountId: user.accountId }, pagina),
    listLocationOptions(user.accountId),
  ]);

  const variosLocales = locations.length > 1;

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={t("subtitulo")}
      >
        <NewWaiterDialog locations={locations} />
      </PageHeader>

      {camareros.total === 0 ? (
        <Card>
          <EmptyState icon={<Users className="size-6" />}>
            {t("sinCamareros")}
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* ── Escritorio ─────────────────────────────────────────────── */}
          <div className="hidden sm:block">
            <Table>
              <Thead>
                <tr>
                  <Th>{t("colNombre")}</Th>
                  {variosLocales ? <Th className="w-[200px]">{t("colLocal")}</Th> : null}
                  <Th className="w-[110px] text-right">{t("colPulseras")}</Th>
                  <Th className="w-[120px]">{t("colAlta")}</Th>
                  <Th className="w-[110px]">{t("colEstado")}</Th>
                  <Th className="w-[90px] text-right">{t("colAcciones")}</Th>
                </tr>
              </Thead>
              <tbody>
                {camareros.data.map((camarero) => (
                  <Tr
                    key={camarero.id}
                    className={camarero.active ? undefined : "opacity-60"}
                  >
                    <Td className="text-sm font-medium text-ex-text">
                      {camarero.name}
                    </Td>
                    {variosLocales ? (
                      <Td className="text-[13px]">{camarero.locationName}</Td>
                    ) : null}
                    <Td className="text-right text-sm font-medium tabular-nums text-ex-text">
                      {formatNumber(camarero.braceletCount, locale)}
                    </Td>
                    <Td className="text-[12px] tabular-nums">
                      {formatDate(camarero.createdAt, locale)}
                    </Td>
                    <Td>
                      <Badge tone={camarero.active ? "active" : "inactive"}>
                        {camarero.active ? t("activo") : t("inactivo")}
                      </Badge>
                    </Td>
                    <Td>
                      <WaiterRowActions waiter={camarero} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* ── Celular ────────────────────────────────────────────────── */}
          <ul className="sm:hidden">
            {camareros.data.map((camarero) => (
              <RowCard
                key={camarero.id}
                className={camarero.active ? undefined : "opacity-60"}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ex-text">
                      {camarero.name}
                    </p>
                    {variosLocales ? (
                      <p className="mt-0.5 truncate text-[12.5px] text-ex-text-muted">
                        {camarero.locationName}
                      </p>
                    ) : null}
                  </div>
                  <WaiterRowActions waiter={camarero} />
                </div>

                <RowFields className="grid-cols-3">
                  <RowField label={t("colPulseras")}>
                    <span className="font-semibold tabular-nums text-ex-text">
                      {formatNumber(camarero.braceletCount, locale)}
                    </span>
                  </RowField>
                  <RowField label={t("colAlta")}>
                    <span className="tabular-nums">
                      {formatDate(camarero.createdAt, locale)}
                    </span>
                  </RowField>
                  <RowField label={t("colEstado")}>
                    <Badge tone={camarero.active ? "active" : "inactive"}>
                      {camarero.active ? t("activo") : t("inactivo")}
                    </Badge>
                  </RowField>
                </RowFields>
              </RowCard>
            ))}
          </ul>

          <Pagination
            paged={camareros}
            basePath="/panel/camareros"
            searchParams={params}
            itemLabel={t("itemLabel")}
          />
        </Card>
      )}
    </>
  );
}
