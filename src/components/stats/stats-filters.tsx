"use client";

import { CalendarRange, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Input, Select } from "@/components/ui/input";
import { PERIOD_PRESETS } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Filtros de las pantallas de estadísticas.
 *
 * Todo va a la query string: el filtro sobrevive al refresh, el link se puede
 * compartir y el botón de exportar reutiliza exactamente los mismos
 * parámetros sin duplicar estado.
 *
 * Los presets y el rango a medida son excluyentes: elegir uno borra el otro de
 * la URL, así nunca queda ambiguo qué período se está mirando.
 */
import { useTranslations } from "next-intl";

export function StatsFilters({
  locations,
  showLocation = true,
  /** Fecha máxima seleccionable, calculada en el servidor para evitar que el
   *  reloj del navegador arme rangos en el futuro. */
  maxDate,
}: {
  locations: { id: number; name: string }[];
  showLocation?: boolean;
  maxDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Stats");
  const [pending, startTransition] = React.useTransition();

  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const rangoActivo = Boolean(desde && hasta);

  const periodo = rangoActivo ? "" : (searchParams.get("periodo") ?? "30d");
  const granularidad = searchParams.get("g") ?? "day";
  const local = searchParams.get("local") ?? "";

  // El panel de fechas arranca abierto si ya hay un rango puesto.
  const [abierto, setAbierto] = React.useState(rangoActivo);

  function navegar(params: URLSearchParams) {
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  function elegirPreset(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", key);
    // Un preset y un rango a medida no pueden convivir.
    params.delete("desde");
    params.delete("hasta");
    setAbierto(false);
    navegar(params);
  }

  function actualizarFecha(campo: "desde" | "hasta", valor: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (valor === "") params.delete(campo);
    else params.set(campo, valor);

    // El rango solo se aplica cuando están las dos puntas; hasta entonces se
    // deja el preset para no dejar la pantalla sin período.
    if (params.get("desde") && params.get("hasta")) {
      params.delete("periodo");
    }

    navegar(params);
  }

  function limpiarRango() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("desde");
    params.delete("hasta");
    params.set("periodo", "30d");
    setAbierto(false);
    navegar(params);
  }

  function actualizar(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "") params.delete(key);
    else params.set(key, value);
    navegar(params);
  }

  const granularidades = [
    { value: "day", label: t("dia") },
    { value: "week", label: t("semana") },
    { value: "month", label: t("mes") },
  ];

  return (
    <div className="mb-4 space-y-2 sm:mb-5">
      {/* En celular los grupos de botones scrollean en horizontal dentro de su
          propia píldora, en vez de romper en varias filas. */}
      <div className="ex-nav-scroll flex items-center gap-2 overflow-x-auto pb-0.5">
        {/* Período: botones y no un select, porque es el control que más se toca. */}
        <div className="flex shrink-0 items-center rounded-pill border border-ex-border bg-ex-surface p-1 shadow-subtle">
          {Object.keys(PERIOD_PRESETS).map((key) => {
            // La clave de la traducción sale del preset: `7d` → `preset7d`.
            const label = t(`preset${key}`);

            return (
              <button
                key={key}
                type="button"
                disabled={pending}
                onClick={() => elegirPreset(key)}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150",
                  periodo === key
                    ? "bg-ex-blue text-white"
                    : "text-ex-text-muted hover:text-ex-text"
                )}
              >
                {label}
              </button>
            );
          })}

          <button
            type="button"
            disabled={pending}
            onClick={() => setAbierto((valor) => !valor)}
            title={t("fechas")}
            className={cn(
              "flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12.5px] font-medium",
              "transition-colors duration-150",
              rangoActivo
                ? "bg-ex-blue text-white"
                : abierto
                  ? "bg-ex-elevated text-ex-text"
                  : "text-ex-text-muted hover:text-ex-text"
            )}
          >
            <CalendarRange className="size-3.5" />
            {t("fechas")}
          </button>
        </div>

        <div className="flex shrink-0 items-center rounded-pill border border-ex-border bg-ex-surface p-1 shadow-subtle">
          {granularidades.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={pending}
              onClick={() => actualizar("g", item.value)}
              className={cn(
                "rounded-pill px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150",
                granularidad === item.value
                  ? "bg-ex-navy text-ex-text"
                  : "text-ex-text-muted hover:text-ex-text"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* El selector de local solo aparece si hay más de uno: con un solo
            local sería un control que nunca cambia nada. */}
        {showLocation && locations.length > 1 ? (
          <Select
            value={local}
            disabled={pending}
            onChange={(event) => actualizar("local", event.target.value)}
            aria-label={t("todosLosLocales")}
            className="h-10 w-auto min-w-[170px] shrink-0 text-[13px]"
          >
            <option value="">{t("todosLosLocales")}</option>
            {locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {/* Panel de fechas. Se despliega con una animación corta para que se
          entienda de dónde salió. */}
      {abierto ? (
        <div className="flex animate-fade-up flex-wrap items-end gap-3 rounded-card border border-ex-border bg-ex-surface p-4 shadow-card">
          <div className="space-y-1">
            <label
              htmlFor="rango-desde"
              className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-ex-text-muted"
            >
              {t("desde")}
            </label>
            <Input
              id="rango-desde"
              type="date"
              value={desde}
              max={hasta || maxDate}
              disabled={pending}
              onChange={(event) => actualizarFecha("desde", event.target.value)}
              className="w-[155px] text-[13px]"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="rango-hasta"
              className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-ex-text-muted"
            >
              {t("hasta")}
            </label>
            <Input
              id="rango-hasta"
              type="date"
              value={hasta}
              min={desde || undefined}
              max={maxDate}
              disabled={pending}
              onChange={(event) => actualizarFecha("hasta", event.target.value)}
              className="w-[155px] text-[13px]"
            />
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              // Un solo día: las dos puntas iguales.
              const params = new URLSearchParams(searchParams.toString());
              params.set("desde", maxDate);
              params.set("hasta", maxDate);
              params.delete("periodo");
              navegar(params);
            }}
            className="h-10 rounded-control border border-ex-border px-3 text-[13px] text-ex-text-muted
                       transition-colors duration-150 hover:border-ex-blue/40 hover:text-ex-text"
          >
            {t("hoy")}
          </button>

          {rangoActivo ? (
            <button
              type="button"
              disabled={pending}
              onClick={limpiarRango}
              className="flex h-10 items-center gap-1.5 rounded-control border border-ex-border px-3
                         text-xs text-ex-text-muted transition-colors duration-150
                         hover:border-ex-danger/40 hover:text-ex-danger"
            >
              <X className="size-3.5" />
              {t("quitarRango")}
            </button>
          ) : (
            <p className="pb-1.5 text-[11px] text-ex-text-muted">
              {t("elegirRangoHint")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
