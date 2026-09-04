import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listAccountOptions } from "@/db/queries/accounts";
import { listUsers } from "@/db/queries/users";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { EditUserDialog, NewUserDialog } from "./user-dialogs";

export const metadata = { title: "Usuarios · Toqia Admin" };
export const dynamic = "force-dynamic";

const ROLES: Record<string, { label: string; tone: "accent" | "warning" | "inactive" }> = {
  admin: { label: "admin", tone: "accent" },
  distributor: { label: "distribuidor", tone: "warning" },
  restaurant: { label: "restaurante", tone: "inactive" },
};

export default async function AdminUsersPage() {
  const actual = await requireAdmin();

  const [usuarios, cuentas] = await Promise.all([listUsers(), listAccountOptions()]);

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Accesos al sistema. No hay registro público: todos se crean acá."
      >
        <NewUserDialog accounts={cuentas} />
      </PageHeader>

      {usuarios.length === 0 ? (
        <Card>
          <EmptyState>No hay usuarios cargados.</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Nombre</Th>
                <Th className="w-[260px]">Email</Th>
                <Th className="w-[130px]">Rol</Th>
                <Th className="w-[220px]">Cuenta</Th>
                <Th className="w-[120px]">Alta</Th>
                <Th className="w-[80px] text-right">Acciones</Th>
              </tr>
            </Thead>
            <tbody>
              {usuarios.map((usuario) => {
                const rol = ROLES[usuario.role] ?? {
                  label: usuario.role,
                  tone: "inactive" as const,
                };

                return (
                  <Tr key={usuario.id}>
                    <Td className="text-sm text-ex-text">
                      {usuario.name}
                      {usuario.id === actual.id ? (
                        <span className="ml-2 font-mono text-[10px] text-ex-text-disabled">
                          vos
                        </span>
                      ) : null}
                    </Td>
                    <Td className="font-mono text-xs">{usuario.email}</Td>
                    <Td>
                      <Badge tone={rol.tone}>{rol.label}</Badge>
                    </Td>
                    <Td className="text-xs">
                      {usuario.accountName ?? (
                        <span className="text-ex-text-disabled">—</span>
                      )}
                    </Td>
                    <Td className="num text-[11px]">{formatDate(usuario.createdAt)}</Td>
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

      <p className="mt-4 text-[11px] text-ex-text-muted">
        Un usuario con rol restaurante sin cuenta asignada no puede ver nada: si
        ves una fila así, editala y asignale la cuenta.
      </p>
    </>
  );
}
