import { asc, eq } from "drizzle-orm";

import { accounts, db, user } from "@/db";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountId: number | null;
  accountName: string | null;
  createdAt: Date;
};

export async function listUsers(): Promise<UserListItem[]> {
  const filas = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountId: user.accountId,
      accountName: accounts.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .leftJoin(accounts, eq(user.accountId, accounts.id))
    .orderBy(asc(user.role), asc(user.email));

  return filas.map((fila) => ({
    ...fila,
    accountName: fila.accountName ?? null,
  }));
}
