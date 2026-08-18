"use client";

import { Download, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type RestaurantOption = { id: number; name: string };
type BraceletOption = { id: number; code: string; restaurantId: number };

/**
 * Filtros de la tabla de escaneos.
 *
 * Todo va a la query string: así el filtro sobrevive al refresh, se puede
 * compartir el link y el botón de exportar CSV reutiliza exactamente los
 * mismos parámetros sin duplicar estado.
 */
export function ScanFilters({
  restaurants,
  bracelets,
}: {
  restaurants: RestaurantOption[];
  bracelets: BraceletOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const restaurant = searchParams.get("restaurant") ?? "";
  const bracelet = searchParams.get("bracelet") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const hayFiltros = Boolean(restaurant || bracelet || from || to);

  // Al elegir un restaurante, el select de pulseras se limita a las suyas.
  const braceletsVisibles = React.useMemo(() => {
    if (!restaurant) return bracelets;
    const id = Number(restaurant);
    return bracelets.filter((item) => item.restaurantId === id);
  }, [bracelets, restaurant]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "") params.delete(key);
    else params.set(key, value);

    // Cambiar de restaurante invalida la pulsera elegida si ya no pertenece.
    if (key === "restaurant") {
      const braceletId = Number(params.get("bracelet"));
      const sigueSiendoValida = bracelets.some(
        (item) => item.id === braceletId && String(item.restaurantId) === value
      );
      if (!sigueSiendoValida) params.delete("bracelet");
    }

    // Cualquier cambio de filtro vuelve a la primera página.
    params.delete("page");

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/admin/scans?${query}` : "/admin/scans");
    });
  }

  function limpiar() {
    startTransition(() => router.push("/admin/scans"));
  }

  const exportHref = `/admin/scans/export?${searchParams.toString()}`;

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-ex-border bg-ex-surface px-4 py-3">
      <div className="space-y-1">
        <Label htmlFor="f-restaurant">Restaurante</Label>
        <Select
          id="f-restaurant"
          value={restaurant}
          disabled={pending}
          onChange={(event) => updateParam("restaurant", event.target.value)}
          className="h-8 w-[190px] text-xs"
        >
          <option value="">Todos</option>
          {restaurants.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="f-bracelet">Pulsera</Label>
        <Select
          id="f-bracelet"
          value={bracelet}
          disabled={pending}
          onChange={(event) => updateParam("bracelet", event.target.value)}
          className="h-8 w-[140px] font-mono text-xs"
        >
          <option value="">Todas</option>
          {braceletsVisibles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="f-from">Desde</Label>
        <Input
          id="f-from"
          type="date"
          value={from}
          max={to || undefined}
          disabled={pending}
          onChange={(event) => updateParam("from", event.target.value)}
          className="h-8 w-[150px] text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="f-to">Hasta</Label>
        <Input
          id="f-to"
          type="date"
          value={to}
          min={from || undefined}
          disabled={pending}
          onChange={(event) => updateParam("to", event.target.value)}
          className="h-8 w-[150px] text-xs"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {hayFiltros ? (
          <Button variant="ghost" size="sm" onClick={limpiar} disabled={pending}>
            <X />
            Limpiar
          </Button>
        ) : null}

        <a href={exportHref} download>
          <span className="ex-btn-primary">
            <Download className="size-4" />
            Exportar CSV
          </span>
        </a>
      </div>
    </div>
  );
}
