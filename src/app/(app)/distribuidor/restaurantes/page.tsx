import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { listAccounts } from "@/db/queries/accounts";
import { requireDistributor } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";
import { DeleteAccountDialog, NuevoRestauranteDialog } from "./dialogs";

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Distribuidor");
  return { title: t("restaurantes") };
}
export const dynamic = "force-dynamic";

/** El tono es visual; el nombre del estado sale de las traducciones. */
const ETIQUETA_ESTADO: Record<
  string,
  { clave: string; tone: "active" | "inactive" | "warning" | "danger" }
> = {
  trial: { clave: "estadoPrueba", tone: "warning" },
  active: { clave: "estadoActiva", tone: "active" },
  past_due: { clave: "estadoImpaga", tone: "warning" },
  cancelled: { clave: "estadoCancelada", tone: "danger" },
};

export default async function RestaurantesPage() {
  const user = await requireDistributor();

  // El filtro sale de la sesión, no de la URL.
  const [cuentas, t, tc, locale] = await Promise.all([
    listAccounts({ distributorId: user.id }),
    getTranslations("Distribuidor"),
    getTranslations("Cuentas"),
    getLocale(),
  ]);

  /** El estado de suscripción, ya traducido. */
  function estadoDe(valor: string) {
    const estado = ETIQUETA_ESTADO[valor];
    return {
      label: estado ? tc(estado.clave) : valor,
      tone: estado?.tone ?? ("inactive" as const),
    };
  }

  return (
    <>
      <PageHeader
        title={t("restaurantes")}
        subtitle={t("subtituloRestaurantes")}
      >
        <NuevoRestauranteDialog />
      </PageHeader>

      {cuentas.length === 0 ? (
        <Card>
          <EmptyState>{t("sinRestaurantes")}</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Tabla en escritorio */}
          <div className="hidden sm:block">
            <Table>
              <Thead>
                <tr>
                  <Th>{t("colRestaurante")}</Th>
                  <Th className="w-[120px]">{tc("colSuscripcion")}</Th>
                  <Th className="w-[110px]">{t("colAlta")}</Th>
                  <Th className="w-[90px] text-right">{t("locales")}</Th>
                  <Th className="w-[90px] text-right">{t("pulseras")}</Th>
                  <Th className="w-[100px] text-right">{t("escaneos")}</Th>
                  <Th className="w-[70px] text-right">{tc("colAcciones")}</Th>
                </tr>
              </Thead>
              <tbody>
                {cuentas.map((cuenta) => {
                  const estado = estadoDe(cuenta.subscriptionStatus);

                  return (
                    <Tr
                      key={cuenta.id}
                      className={cuenta.active ? undefined : "opacity-60"}
                    >
                      <Td>
                        <span className="block truncate text-[13px] font-medium text-ex-text">
                          {cuenta.name}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-ex-text-disabled">
                          {cuenta.slug}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={estado.tone}>{estado.label}</Badge>
                      </Td>
                      <Td className="num text-[11px]">
                        {formatDate(cuenta.createdAt, locale)}
                      </Td>
                      <Td className="num text-right text-sm">
                        {formatNumber(cuenta.locationCount, locale)}
                      </Td>
                      <Td className="num text-right text-sm">
                        {formatNumber(cuenta.braceletCount, locale)}
                      </Td>
                      <Td className="num text-right text-sm text-ex-text">
                        {formatNumber(cuenta.scanCount, locale)}
                      </Td>
                      <Td>
                        <div className="flex justify-end">
                          <DeleteAccountDialog cuenta={cuenta} />
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Tarjetas en celular: seis columnas no entran en 390px. */}
          <ul className="sm:hidden">
            {cuentas.map((cuenta) => {
              const estado = estadoDe(cuenta.subscriptionStatus);

              return (
                <RowCard
                  key={cuenta.id}
                  className={cuenta.active ? undefined : "opacity-60"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ex-text">
                        {cuenta.name}
                      </p>
                      <p className="truncate font-mono text-[10px] text-ex-text-disabled">
                        {cuenta.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={estado.tone}>{estado.label}</Badge>
                      <DeleteAccountDialog cuenta={cuenta} />
                    </div>
                  </div>

                  <RowFields className="grid-cols-3">
                    <RowField label={t("locales")}>
                      {formatNumber(cuenta.locationCount, locale)}
                    </RowField>
                    <RowField label={t("pulseras")}>
                      {formatNumber(cuenta.braceletCount, locale)}
                    </RowField>
                    <RowField label={t("escaneos")}>
                      <span className="font-semibold text-ex-text">
                        {formatNumber(cuenta.scanCount, locale)}
                      </span>
                    </RowField>
                  </RowFields>
                </RowCard>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
