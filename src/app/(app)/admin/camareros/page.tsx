import { getLocale, getTranslations } from "next-intl/server";

import { AccountFilter } from "@/components/admin/account-filter";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccountOptions } from "@/db/queries/accounts";
import { listWaiters } from "@/db/queries/waiters";
import { parsePageParams } from "@/lib/pagination";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";
import { DeleteWaiterDialog } from "./waiter-dialogs";

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Camareros");
  return { title: t("titulo") };
}
export const dynamic = "force-dynamic";

/**
 * Vista global de camareros.
 *
 * Es de solo lectura a propósito: los camareros los administra cada
 * restaurante desde su panel, que es quien sabe quién entra y quién se va.
 * Acá sirve para diagnosticar ("este local dice que el ranking está vacío") sin
 * tener que entrar con las credenciales del cliente.
 */
export default async function AdminWaitersPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string; page?: string; limit?: string }>;
}) {
  await requireAdmin();
  const [params, t, locale] = await Promise.all([
    searchParams,
    getTranslations("Camareros"),
    getLocale(),
  ]);
  const { cuenta } = params;
  const pagina = parsePageParams(params);

  const cuentaId = cuenta ? Number.parseInt(cuenta, 10) : NaN;
  const filtro = Number.isFinite(cuentaId) ? cuentaId : undefined;

  const [camareros, cuentas] = await Promise.all([
    listWaiters({ accountId: filtro }, pagina),
    listAccountOptions(),
  ]);

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={t("subtituloAdmin")}
      >
        <AccountFilter accounts={cuentas} />
      </PageHeader>

      {camareros.total === 0 ? (
        <Card>
          <EmptyState>{t("sinCamarerosAdmin")}</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>{t("colNombre")}</Th>
                <Th className="w-[240px]">{t("colLocal")}</Th>
                <Th className="w-[110px] text-right">{t("colPulseras")}</Th>
                <Th className="w-[120px]">{t("colAlta")}</Th>
                <Th className="w-[100px]">{t("colEstado")}</Th>
                <Th className="w-[80px] text-right">{t("colAcciones")}</Th>
              </tr>
            </Thead>
            <tbody>
              {camareros.data.map((camarero) => (
                <Tr
                  key={camarero.id}
                  className={camarero.active ? undefined : "opacity-60"}
                >
                  <Td className="text-sm text-ex-text">{camarero.name}</Td>
                  <Td className="text-xs">{camarero.locationName}</Td>
                  <Td className="num text-right text-sm text-ex-text">
                    {formatNumber(camarero.braceletCount, locale)}
                  </Td>
                  <Td className="num text-[11px]">{formatDate(camarero.createdAt, locale)}</Td>
                  <Td>
                    <Badge tone={camarero.active ? "active" : "inactive"}>
                      {camarero.active ? t("activo") : t("inactivo")}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <DeleteWaiterDialog waiter={camarero} />
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          <Pagination
            paged={camareros}
            basePath="/admin/camareros"
            searchParams={params}
            itemLabel={t("itemLabel")}
          />
        </Card>
      )}
    </>
  );
}
