import Link from "next/link";

import { AccountFilter } from "@/components/admin/account-filter";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccountOptions, listDistributors } from "@/db/queries/accounts";
import { listBracelets } from "@/db/queries/bracelets";
import { listLocations } from "@/db/queries/locations";
import { listWaiterOptions } from "@/db/queries/waiters";
import { parsePageParams } from "@/lib/pagination";
import { requireAdmin } from "@/lib/session";
import { braceletUrl, formatDateTime, formatNumber } from "@/lib/utils";
import { BraceletRowActions, BulkCreateDialog, NewBraceletDialog } from "./bracelet-dialogs";

export const metadata = { title: "Pulseras · Toqia Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBraceletsPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string; local?: string; page?: string; limit?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const { cuenta, local } = params;
  const pagina = parsePageParams(params);

  const cuentaId = cuenta ? Number.parseInt(cuenta, 10) : NaN;
  const localId = local ? Number.parseInt(local, 10) : NaN;

  const filtroCuenta = Number.isFinite(cuentaId) ? cuentaId : undefined;
  const filtroLocal = Number.isFinite(localId) ? localId : undefined;

  const [pulseras, locales, cuentas, distribuidores] = await Promise.all([
    listBracelets({ accountId: filtroCuenta, locationId: filtroLocal }, pagina),
    listLocations({ accountId: filtroCuenta }),
    listAccountOptions(),
    listDistributors(),
  ]);

  const opcionesLocales = locales.map((item) => ({
    id: item.id,
    name: item.name,
    accountName: item.accountName,
  }));

  const camareros = await listWaiterOptions(locales.map((item) => item.id));

  return (
    <>
      <PageHeader
        title="Pulseras"
        subtitle="La URL grabada en el chip nunca cambia. Lo que cambia es la página a la que lleva."
      >
        <AccountFilter accounts={cuentas} />
        <NewBraceletDialog
          locations={opcionesLocales}
          distributors={distribuidores}
          defaultLocationId={filtroLocal}
        />
        <BulkCreateDialog
          locations={opcionesLocales}
          distributors={distribuidores}
          defaultLocationId={filtroLocal}
        />
      </PageHeader>

      {locales.length === 0 ? (
        <Card>
          <EmptyState>
            Primero creá un local en{" "}
            <Link
              href="/admin/locales"
              className="text-ex-blue-bright underline underline-offset-4"
            >
              Locales
            </Link>
            .
          </EmptyState>
        </Card>
      ) : pulseras.total === 0 ? (
        <Card>
          <EmptyState>
            No hay pulseras con este filtro. Usá &ldquo;Alta masiva&rdquo; para
            generar una tanda completa.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th className="w-[120px]">Código</Th>
                <Th className="w-[130px]">Etiqueta</Th>
                <Th className="w-[170px]">Local</Th>
                <Th className="w-[140px]">Camarero</Th>
                <Th className="w-[240px]">URL del chip</Th>
                <Th className="w-[85px] text-right">Escaneos</Th>
                <Th className="w-[85px] text-right">Reseñas</Th>
                <Th className="w-[135px]">Último</Th>
                <Th className="w-[90px] text-right">Acciones</Th>
              </tr>
            </Thead>
            <tbody>
              {pulseras.data.map((pulsera) => {
                const url = braceletUrl(pulsera.code);
                // `locationActive` y `accountActive` vienen en null cuando la
                // pulsera está en stock: ahí no hay local ni cuenta que puedan
                // estar dados de baja, así que no cuentan como inactiva.
                const inactiva =
                  !pulsera.active ||
                  pulsera.locationActive === false ||
                  pulsera.accountActive === false;

                return (
                  <Tr key={pulsera.id} className={inactiva ? "opacity-60" : undefined}>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-medium text-ex-text">
                          {pulsera.code}
                        </span>
                        <Badge tone={pulsera.deviceType === "placa" ? "accent" : "inactive"}>
                          {pulsera.deviceType}
                        </Badge>
                        {!pulsera.active ? <Badge tone="inactive">off</Badge> : null}
                        {pulsera.locationId === null ? (
                          <Badge tone="warning">stock</Badge>
                        ) : null}
                        {pulsera.active && pulsera.locationActive === false ? (
                          <Badge tone="warning">local off</Badge>
                        ) : null}
                        {pulsera.active && pulsera.accountActive === false ? (
                          <Badge tone="danger">cuenta baja</Badge>
                        ) : null}
                        {pulsera.overrideUrl ? (
                          <Badge tone="accent" title={pulsera.overrideUrl}>
                            directo
                          </Badge>
                        ) : null}
                      </div>
                    </Td>

                    <Td className="text-xs">{pulsera.label ?? "—"}</Td>

                    {/* Una pulsera sin local está en un stock: se muestra de
                        quién es, que es la única información que hay. */}
                    <Td className="text-xs">
                      {pulsera.locationName ? (
                        <>
                          <span className="block truncate">{pulsera.locationName}</span>
                          <span className="block truncate text-[10px] text-ex-text-disabled">
                            {pulsera.accountName}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block truncate text-ex-text-muted">
                            En stock
                          </span>
                          <span className="block truncate text-[10px] text-ex-text-disabled">
                            {pulsera.distributorName ?? "Toqia"}
                          </span>
                        </>
                      )}
                    </Td>

                    <Td className="text-xs">{pulsera.waiterName ?? "—"}</Td>

                    <Td>
                      <div className="flex items-center gap-2">
                        <span
                          className="min-w-0 flex-1 truncate font-mono text-[11px] text-ex-text-muted"
                          title={url}
                        >
                          {url}
                        </span>
                        <CopyButton value={url} label="Copiar URL para grabar" />
                      </div>
                    </Td>

                    <Td className="num text-right text-sm text-ex-text">
                      {formatNumber(pulsera.scanCount)}
                    </Td>
                    <Td className="num text-right text-sm text-ex-text-secondary">
                      {formatNumber(pulsera.reviewClicks)}
                    </Td>
                    <Td className="num text-[11px]">
                      {formatDateTime(pulsera.lastScanAt)}
                    </Td>

                    <Td>
                      <BraceletRowActions
                        bracelet={pulsera}
                        locations={opcionesLocales}
                        distributors={distribuidores}
                        waiters={camareros}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>

          <Pagination
            paged={pulseras}
            basePath="/admin/pulseras"
            searchParams={params}
            itemLabel="pulseras"
          />
        </Card>
      )}
    </>
  );
}
