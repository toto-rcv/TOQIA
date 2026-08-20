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
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-ex-border bg-ex-surface px-4 py-3">
      {locations.length > 1 ? (
        <div className="space-y-1">
          <Label htmlFor="f-local">Local</Label>
          <Select
            id="f-local"
            value={local}
            disabled={pending}
            onChange={(event) => actualizar("local", event.target.value)}
            className="h-8 w-[170px] text-xs"
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

      <div className="space-y-1">
        <Label htmlFor="f-pulsera">Pulsera</Label>
        <Select
          id="f-pulsera"
          value={pulsera}
          disabled={pending}
          onChange={(event) => actualizar("pulsera", event.target.value)}
          className="h-8 w-[130px] font-mono text-xs"
        >
          <option value="">Todas</option>
          {pulserasVisibles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="f-camarero">Camarero</Label>
        <Select
          id="f-camarero"
          value={camarero}
          disabled={pending}
          onChange={(event) => actualizar("camarero", event.target.value)}
          className="h-8 w-[160px] text-xs"
        >
          <option value="">Todos</option>
          {camarerosVisibles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="f-desde">Desde</Label>
        <Input
          id="f-desde"
          type="date"
          value={desde}
          max={hasta || undefined}
          disabled={pending}
          onChange={(event) => actualizar("desde", event.target.value)}
          className="h-8 w-[150px] text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="f-hasta">Hasta</Label>
        <Input
          id="f-hasta"
          type="date"
          value={hasta}
          min={desde || undefined}
          disabled={pending}
          onChange={(event) => actualizar("hasta", event.target.value)}
          className="h-8 w-[150px] text-xs"
        />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => actualizar("convertidos", convertidos ? "" : "1")}
        className={cn(
          "h-8 rounded-control border px-3 text-xs transition-colors",
          convertidos
            ? "border-ex-blue/50 bg-ex-blue/10 text-ex-blue-bright"
            : "border-ex-border text-ex-text-muted hover:text-ex-text"
        )}
      >
        Solo con reseña
      </button>

      <div className="ml-auto flex items-center gap-2">
        {hayFiltros ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => router.push(pathname))}
          >
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
