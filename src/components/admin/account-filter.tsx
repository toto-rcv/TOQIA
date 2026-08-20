"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Select } from "@/components/ui/input";

/**
 * Filtro por cuenta para las tablas del admin.
 * Va a la query string para que el filtro sobreviva al refresh y el link se
 * pueda compartir.
 */
export function AccountFilter({
  accounts,
  paramName = "cuenta",
}: {
  accounts: { id: number; name: string }[];
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const current = searchParams.get(paramName) ?? "";

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (event.target.value === "") params.delete(paramName);
    else params.set(paramName, event.target.value);
    // Cambiar de cuenta invalida el local elegido y la paginación.
    params.delete("local");
    params.delete("page");

    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <Select
      value={current}
      onChange={handleChange}
      disabled={pending}
      aria-label="Filtrar por cuenta"
      className="h-8 w-auto min-w-[190px] text-xs"
    >
      <option value="">Todas las cuentas</option>
      {accounts.map((cuenta) => (
        <option key={cuenta.id} value={cuenta.id}>
          {cuenta.name}
        </option>
      ))}
    </Select>
  );
}
