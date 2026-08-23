"use client";

import { Download, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Option = { id: number; name: string };
type BraceletOption = { id: number; code: string; locationId: number };
type WaiterOption = { id: number; name: string; locationId: number };

/**
 * Filtros de la tabla de escaneos.
 *
 * Todo va a la query string: el filtro sobrevive al refresh, el link se puede
 * compartir y el botón de exportar reutiliza los mismos parámetros sin
 * duplicar estado.
 */
export function ScanFiltersBar({
  locations,
  bracelets,
  waiters,
  exportPath,
}: {
  locations: Option[];
  bracelets: BraceletOption[];
  waiters: WaiterOption[];
  exportPath: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const local = searchParams.get("local") ?? "";
  const pulsera = searchParams.get("pulsera") ?? "";
  const camarero = searchParams.get("camarero") ?? "";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const convertidos = searchParams.get("convertidos") === "1";

  const hayFiltros = Boolean(
    local || pulsera || camarero || desde || hasta || convertidos
  );

  // Al elegir un local, los selectores de pulsera y camarero se limitan a él.
  const localId = local ? Number(local) : null;
  const pulserasVisibles = localId
    ? bracelets.filter((item) => item.locationId === localId)
    : bracelets;
  const camarerosVisibles = localId
    ? waiters.filter((item) => item.locationId === localId)
    : waiters;

  function actualizar(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "") params.delete(key);
    else params.set(key, value);

    // Cambiar de local invalida la pulsera y el camarero elegidos si ya no
    // pertenecen a ese local.
    if (key === "local") {
      const braceletId = Number(params.get("pulsera"));
      if (!bracelets.some((b) => b.id === braceletId && String(b.locationId) === value)) {
        params.delete("pulsera");
      }
      const waiterId = Number(params.get("camarero"));
      if (!waiters.some((w) => w.id === waiterId && String(w.locationId) === value)) {
        params.delete("camarero");
      }
    }

    params.delete("page");

    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  const exportHref = `${exportPath}?${searchParams.toString()}`;

  return (
    /* En celular, una grilla de dos columnas: cinco desplegables en fila
       obligarían a un scroll horizontal dentro de la propia barra. */
    <div
      className="mb-4 rounded-card border border-ex-border bg-ex-surface p-4 shadow-card
                 sm:px-5"
    >
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
      {locations.length > 1 ? (
        <div className="space-y-1">
          <Label htmlFor="f-local">Local</Label>
          <Select
            id="f-local"
            value={local}
            disabled={pending}
            onChange={(event) => actualizar("local", event.target.value)}
            className="text-[13px] sm:w-[170px]"
          >
            <option value="">Todos</option>
            {locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="f-pulsera">Pulsera</Label>
        <Select
          id="f-pulsera"
          value={pulsera}
          disabled={pending}
          onChange={(event) => actualizar("pulsera", event.target.value)}
          className="font-mono text-[13px] sm:w-[130px]"
        >
          <option value="">Todas</option>
          {pulserasVisibles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-camarero">Camarero</Label>
        <Select
          id="f-camarero"
          value={camarero}
          disabled={pending}
          onChange={(event) => actualizar("camarero", event.target.value)}
          className="text-[13px] sm:w-[160px]"
        >
          <option value="">Todos</option>
          {camarerosVisibles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-desde">Desde</Label>
        <Input
          id="f-desde"
          type="date"
          value={desde}
          max={hasta || undefined}
          disabled={pending}
          onChange={(event) => actualizar("desde", event.target.value)}
          className="text-[13px] sm:w-[150px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-hasta">Hasta</Label>
        <Input
          id="f-hasta"
          type="date"
          value={hasta}
          min={desde || undefined}
          disabled={pending}
          onChange={(event) => actualizar("hasta", event.target.value)}
          className="text-[13px] sm:w-[150px]"
        />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => actualizar("convertidos", convertidos ? "" : "1")}
        aria-pressed={convertidos}
        className={cn(
          "col-span-2 h-11 rounded-control border px-3 text-[13px] font-medium",
          "transition-colors sm:col-span-1 sm:h-10",
          convertidos
            ? "border-ex-blue/50 bg-ex-blue-wash text-ex-blue-deep"
            : "border-ex-border text-ex-text-secondary hover:text-ex-text"
        )}
      >
        Solo con reseña
      </button>
    </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ex-border-subtle pt-3">
        {hayFiltros ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => router.push(pathname))}
          >
            <X />
            Limpiar filtros
          </Button>
        ) : (
          <span className="text-[12px] text-ex-text-muted">Sin filtros aplicados</span>
        )}

        <a href={exportHref} download className="shrink-0">
          <span className="ex-btn-ghost">
            <Download className="size-4" />
            <span className="max-sm:hidden">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </span>
        </a>
      </div>
    </div>
  );
}
