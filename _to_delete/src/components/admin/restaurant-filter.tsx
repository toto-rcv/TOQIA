"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Select } from "@/components/ui/input";

/**
 * Filtro por restaurante. Escribe en la query string en vez de en el estado
 * local para que el filtro sobreviva a un refresh y se pueda compartir el link.
 */
export function RestaurantFilter({
  restaurants,
  paramName = "restaurant",
}: {
  restaurants: { id: number; name: string }[];
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const current = searchParams.get(paramName) ?? "";

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (event.target.value === "") {
      params.delete(paramName);
    } else {
      params.set(paramName, event.target.value);
    }
    // Al cambiar de restaurante volvemos a la primera página.
    params.delete("page");

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <Select
      value={current}
      onChange={handleChange}
      disabled={pending}
      aria-label="Filtrar por restaurante"
      className="h-8 w-auto min-w-[180px] text-xs"
    >
      <option value="">Todos los restaurantes</option>
      {restaurants.map((restaurant) => (
        <option key={restaurant.id} value={restaurant.id}>
          {restaurant.name}
        </option>
      ))}
    </Select>
  );
}
