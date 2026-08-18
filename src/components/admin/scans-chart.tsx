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

import type { DailyPoint } from "@/db/queries/dashboard";

/**
 * Escaneos por día de los últimos 30 días.
 *
 * Serie única y conteos discretos por día: barras. Una sola serie no lleva
 * leyenda (el título ya la nombra) y el color es el acento del sistema, que
 * pasa contraste ≥3:1 contra la superficie #101722.
 *
 * Grilla y ejes son recesivos a propósito: lo que se tiene que leer son las
 * barras, no el andamiaje.
 */

const ACCENT = "#3B82F6";
const GRID = "#1D2734";
const AXIS_TEXT = "#647184";

type ChartPoint = DailyPoint & { etiqueta: string; etiquetaLarga: string };

export function ScansChart({ data }: { data: DailyPoint[] }) {
  const points = React.useMemo<ChartPoint[]>(
    () =>
      data.map((point) => {
        // El punto viene como "YYYY-MM-DD" en UTC. Lo parseamos como fecha
        // local a mano para que no se corra un día al renderizar.
        const [year, month, day] = point.date.split("-").map(Number);
        const fecha = new Date(year, month - 1, day);
        return {
          ...point,
          etiqueta: new Intl.DateTimeFormat("es-AR", {
            day: "2-digit",
            month: "2-digit",
          }).format(fecha),
          etiquetaLarga: new Intl.DateTimeFormat("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(fecha),
        };
      }),
    [data]
  );

  const maximo = React.useMemo(
    () => points.reduce((acc, point) => Math.max(acc, point.total), 0),
    [points]
  );

  if (maximo === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-ex-text-muted">
        Todavía no hay escaneos registrados en los últimos 30 días.
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid
            vertical={false}
            stroke={GRID}
            strokeDasharray="0"
            strokeOpacity={0.7}
          />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tick={{ fill: AXIS_TEXT, fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            // Con 30 días, mostrar todas las etiquetas las apila una encima de
            // otra. Mostramos una cada cuatro.
            interval={3}
            minTickGap={4}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            tick={{ fill: AXIS_TEXT, fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(59,130,246,0.08)" }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="total"
            fill={ACCENT}
            // Extremo de dato redondeado, anclado a la línea base.
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
};

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-control border border-ex-border bg-ex-elevated px-3 py-2">
      <p className="text-[11px] capitalize text-ex-text-muted">{point.etiquetaLarga}</p>
      <p className="mt-0.5 font-mono text-sm text-ex-text">
        {point.total} {point.total === 1 ? "escaneo" : "escaneos"}
      </p>
    </div>
  );
}
