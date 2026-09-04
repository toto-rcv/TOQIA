import Link from "next/link";
import { Eye } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { AccountFilter } from "@/components/admin/account-filter";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccountOptions } from "@/db/queries/accounts";
import { listLocations } from "@/db/queries/locations";
import { requireAdmin } from "@/lib/session";
import { formatNumber } from "@/lib/utils";
import { LocationRowActions, NewLocationDialog } from "./location-dialogs";

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Locales");
  return { title: t("titulo") };
}
export const dynamic = "force-dynamic";

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string }>;
}) {
  await requireAdmin();
  const [{ cuenta }, t, locale] = await Promise.all([
    searchParams,
    getTranslations("Locales"),
    getLocale(),
  ]);

  const cuentaId = cuenta ? Number.parseInt(cuenta, 10) : NaN;
  const filtro = Number.isFinite(cuentaId) ? cuentaId : undefined;

  const [locales, cuentas] = await Promise.all([
    listLocations({ accountId: filtro }),
    listAccountOptions(),
  ]);

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={t("subtitulo")}
      >
        <AccountFilter accounts={cuentas} />
        <NewLocationDialog accounts={cuentas} defaultAccountId={filtro} />
      </PageHeader>

      {cuentas.length === 0 ? (
        <Card>
          <EmptyState>
            {t.rich("primeroUnaCuenta", {
              enlace: (chunks) => (
                <Link
                  href="/admin/cuentas"
                  className="text-ex-blue-bright underline underline-offset-4"
                >
                  {chunks}
                </Link>
              ),
            })}
          </EmptyState>
        </Card>
      ) : locales.length === 0 ? (
        <Card>
          <EmptyState>
            {filtro ? t("sinLocalesDeCuenta") : t("sinLocales")}
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>{t("colLocal")}</Th>
                <Th className="w-[190px]">{t("colCuenta")}</Th>
                <Th className="w-[110px] text-center">{t("colResenas")}</Th>
                <Th className="w-[100px] text-right">{t("colPulseras")}</Th>
                <Th className="w-[100px] text-right">{t("colEscaneos")}</Th>
                <Th className="w-[90px]">{t("colEstado")}</Th>
                <Th className="w-[130px] text-right">{t("colAcciones")}</Th>
              </tr>
            </Thead>
            <tbody>
              {locales.map((local) => (
                <Tr key={local.id} className={local.active ? undefined : "opacity-60"}>
                  <Td>
                    <Link
                      href={`/admin/pulseras?local=${local.id}`}
                      className="text-sm text-ex-text transition-colors hover:text-ex-blue-bright"
                    >
                      {local.name}
                    </Link>
                    <p className="font-mono text-[10px] text-ex-text-disabled">
                      {local.slug}
                    </p>
                  </Td>

                  <Td className="text-xs">{local.accountName}</Td>

                  <Td className="text-center">
                    {local.googleReviewUrl ? (
                      <Badge tone="active">{t("resenaCargada")}</Badge>
                    ) : (
                      <Badge tone="warning" title={t("resenaFaltaHint")}>
                        {t("resenaFalta")}
                      </Badge>
                    )}
                  </Td>

                  <Td className="num text-right text-sm text-ex-text">
                    {formatNumber(local.braceletCount, locale)}
                  </Td>
                  <Td className="num text-right text-sm text-ex-text">
                    {formatNumber(local.scanCount, locale)}
                  </Td>

                  <Td>
                    <Badge tone={local.active ? "active" : "inactive"}>
                      {local.active ? t("activo") : t("inactivo")}
                    </Badge>
                  </Td>

                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/vista-previa?local=${local.id}`}
                        target="_blank"
                        title={t("verPaginaPublica")}
                        aria-label={t("verPaginaPublica")}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                                   border-ex-border text-ex-text-muted transition-colors
                                   hover:border-ex-blue/40 hover:text-ex-text"
                      >
                        <Eye className="size-3.5" />
                      </Link>
                      <LocationRowActions location={local} accounts={cuentas} />
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
