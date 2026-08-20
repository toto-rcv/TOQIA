"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SeriesPoint } from "@/db/queries/stats";

/**
 * Evolución de escaneos y reseñas.
 *
 * Dos series de conteos discretos por período: barras agrupadas. Agrupadas y
 * no apiladas a propósito — las reseñas son un subconjunto de los escaneos, y
 * apilarlas sumaría dos veces la misma gente y exageraría el total.
 *
 * Los dos colores pasaron el validador de paleta contra la superficie #101722:
 * separación para daltonismo ΔE 30.2 y contraste ≥3:1. Con dos series la
 * leyenda es obligatoria, así que va siempre.
 */

const COLOR_SCANS = "#3B82F6";
const COLOR_REVIEWS = "#D97706";
const GRID = "#1D2734";
const AXIS_TEXT = "#647184";

export function EvolutionChart({ data }: { data: SeriesPoint[] }) {
  const maximo = React.useMemo(
    () => data.reduce((acc, punto) => Math.max(acc, punto.scans), 0),
    [data]
  );

  // Con muchos puntos, mostrar todas las etiquetas las apila una sobre otra.
  const intervalo = React.useMemo(() => {
    if (data.length <= 10) return 0;
    return Math.max(1, Math.ceil(data.length / 10) - 1);
  }, [data.length]);

  if (data.length === 0 || maximo === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-ex-text-muted">
        Todavía no hay escaneos en este período.
      </div>
    );
  }

  return (
    <div>
      <Leyenda />

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeOpacity={0.7} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tick={{
                fill: AXIS_TEXT,
                fontSize: 10,
                fontFamily: "var(--font-geist-mono)",
              }}
              interval={intervalo}
              minTickGap={4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tick={{
                fill: AXIS_TEXT,
                fontSize: 10,
                fontFamily: "var(--font-geist-mono)",
              }}
            />
            <Tooltip
              cursor={{ fill: "rgba(59,130,246,0.08)" }}
              content={<ChartTooltip />}
            />
            {/* 2px de separación entre barras vecinas para que no se toquen. */}
            <Bar
              dataKey="scans"
              name="Escaneos"
              fill={COLOR_SCANS}
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
              barSize={10}
            />
            <Bar
              dataKey="reviewClicks"
              name="Reseñas"
              fill={COLOR_REVIEWS}
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
              barSize={10}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Leyenda() {
  return (
    <div className="mb-3 flex items-center gap-4">
      <ItemLeyenda color={COLOR_SCANS} label="Escaneos" />
      <ItemLeyenda color={COLOR_REVIEWS} label="Fueron a dejar reseña" />
    </div>
  );
}

function ItemLeyenda({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-ex-text-secondary">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: SeriesPoint }>;
};

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const punto = payload[0].payload;
  const tasa =
    punto.scans === 0 ? 0 : Math.round((punto.reviewClicks / punto.scans) * 100);

  return (
    <div className="rounded-control border border-ex-border bg-ex-elevated px-3 py-2">
      <p className="text-[11px] text-ex-text-muted">{punto.label}</p>
      <p className="mt-1 font-mono text-sm text-ex-text">
        {punto.scans} {punto.scans === 1 ? "escaneo" : "escaneos"}
      </p>
      <p className="font-mono text-xs" style={{ color: COLOR_REVIEWS }}>
        {punto.reviewClicks} a reseña · {tasa}%
      </p>
    </div>
  );
}
