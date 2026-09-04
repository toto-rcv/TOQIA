import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccountOptions } from "@/db/queries/accounts";
import { listUsers } from "@/db/queries/users";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { EditUserDialog, NewUserDialog } from "./user-dialogs";

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Usuarios");
  return { title: t("titulo") };
}
export const dynamic = "force-dynamic";

/** El tono es visual; el nombre del rol sale de las traducciones. */
const ROLES: Record<string, { clave: string; tone: "accent" | "warning" | "inactive" }> = {
  admin: { clave: "rolAdmin", tone: "accent" },
  distributor: { clave: "rolDistribuidor", tone: "warning" },
  restaurant: { clave: "rolRestaurante", tone: "inactive" },
};

export default async function AdminUsersPage() {
  const actual = await requireAdmin();

  const [usuarios, cuentas, t, locale] = await Promise.all([
    listUsers(),
    listAccountOptions(),
    getTranslations("Usuarios"),
    getLocale(),
  ]);

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={t("subtitulo")}
      >
        <NewUserDialog accounts={cuentas} />
      </PageHeader>

      {usuarios.length === 0 ? (
        <Card>
          <EmptyState>{t("sinUsuarios")}</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>{t("colNombre")}</Th>
                <Th className="w-[260px]">{t("colEmail")}</Th>
                <Th className="w-[130px]">{t("colRol")}</Th>
                <Th className="w-[220px]">{t("colCuenta")}</Th>
                <Th className="w-[120px]">{t("colAlta")}</Th>
                <Th className="w-[80px] text-right">{t("colAcciones")}</Th>
              </tr>
            </Thead>
            <tbody>
              {usuarios.map((usuario) => {
                const rol = ROLES[usuario.role];
                const etiquetaDeRol = rol ? t(rol.clave) : usuario.role;
                const tonoDeRol = rol?.tone ?? ("inactive" as const);

                return (
                  <Tr key={usuario.id}>
                    <Td className="text-sm text-ex-text">
                      {usuario.name}
                      {usuario.id === actual.id ? (
                        <span className="ml-2 font-mono text-[10px] text-ex-text-disabled">
                          {t("vos")}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="font-mono text-xs">{usuario.email}</Td>
                    <Td>
                      <Badge tone={tonoDeRol}>{etiquetaDeRol}</Badge>
                    </Td>
                    <Td className="text-xs">
                      {usuario.accountName ?? (
                        <span className="text-ex-text-disabled">—</span>
                      )}
                    </Td>
                    <Td className="num text-[11px]">{formatDate(usuario.createdAt, locale)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <EditUserDialog
                          usuario={{
                            id: usuario.id,
                            name: usuario.name,
                            email: usuario.email,
                            role: usuario.role,
                            accountId: usuario.accountId,
                          }}
                          accounts={cuentas}
                          esVos={usuario.id === actual.id}
                        />
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <p className="mt-4 text-[11px] text-ex-text-muted">{t("aviso")}</p>
    </>
  );
}
