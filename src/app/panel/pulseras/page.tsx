import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listBracelets } from "@/db/queries/bracelets";
import { listLocationOptions } from "@/db/queries/locations";
import { listWaiterOptions } from "@/db/queries/waiters";
import { requireRestaurantUser } from "@/lib/session";
import { braceletUrl, formatDateTime, formatNumber } from "@/lib/utils";
import { WaiterSelect } from "./waiter-select";

export const metadata = { title: "Pulseras · Toqia" };
export const dynamic = "force-dynamic";

export default async function PanelBraceletsPage() {
  const user = await requireRestaurantUser();

  const [bracelets, locations] = await Promise.all([
    listBracelets({ accountId: user.accountId }),
    listLocationOptions(user.accountId),
  ]);

  const waiters = await listWaiterOptions(locations.map((item) => item.id));
  const variosLocales = locations.length > 1;

  return (
    <>
      <PageHeader
        title="Pulseras"
        subtitle="Asigná cada pulsera a un camarero para que sus escaneos entren al ranking."
      />

      {bracelets.length === 0 ? (
        <Card>
          <EmptyState>
            Todavía no tenés pulseras cargadas. Las da de alta el equipo de Toqia.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th className="w-[110px]">Código</Th>
                <Th className="w-[150px]">Etiqueta</Th>
                {variosLocales ? <Th className="w-[160px]">Local</Th> : null}
                <Th className="w-[180px]">Camarero</Th>
                <Th className="w-[230px]">URL del chip</Th>
                <Th className="w-[90px] text-right">Escaneos</Th>
                <Th className="w-[90px] text-right">Reseñas</Th>
                <Th className="w-[140px]">Último</Th>
              </tr>
            </Thead>
            <tbody>
              {bracelets.map((pulsera) => {
                const url = braceletUrl(pulsera.code);
                const inactiva = !pulsera.active || !pulsera.locationActive;

                return (
                  <Tr key={pulsera.id} className={inactiva ? "opacity-60" : undefined}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-ex-text">
                          {pulsera.code}
                        </span>
                        {!pulsera.active ? <Badge tone="inactive">off</Badge> : null}
                      </div>
                    </Td>

                    <Td className="text-xs">{pulsera.label ?? "—"}</Td>

                    {variosLocales ? (
                      <Td className="text-xs">{pulsera.locationName}</Td>
                    ) : null}

                    <Td>
                      <WaiterSelect
                        braceletId={pulsera.id}
                        waiterId={pulsera.waiterId}
                        waiters={waiters.filter(
                          (camarero) => camarero.locationId === pulsera.locationId
                        )}
                      />
                    </Td>

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
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
