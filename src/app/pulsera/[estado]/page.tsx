import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Páginas de caso borde del escaneo.
 *
 * Comparten la estética de la landing (negro con dorado) para que el cliente
 * no sienta que se rompió algo distinto. Nunca muestran un error técnico: la
 * persona no puede hacer nada con esa información, así que le decimos qué pasó
 * y a quién avisar.
 */

const ESTADOS = {
  "no-reconocida": {
    titulo: "Pulsera no reconocida",
    detalle:
      "Esta pulsera no figura en el sistema. Puede que haya sido dada de baja o que el código esté mal grabado.",
    accion: "Avisale al personal del local para que la revisen.",
  },
  inactiva: {
    titulo: "Esta pulsera no está activa",
    detalle:
      "La pulsera existe pero está desactivada en este momento, así que no tiene un destino al que llevarte.",
    accion: "Avisale al personal del local para que la reactiven.",
  },
  "sin-destino": {
    titulo: "Destino no configurado",
    detalle: "La pulsera está activa pero todavía no tiene cargado a dónde llevarte.",
    accion: "Avisale al personal del local para que terminen de configurarla.",
  },
} as const;

type Estado = keyof typeof ESTADOS;

function isEstado(value: string): value is Estado {
  return value in ESTADOS;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ estado: string }>;
}): Promise<Metadata> {
  const { estado } = await params;
  const contenido = isEstado(estado) ? ESTADOS[estado] : null;
  return {
    title: contenido ? contenido.titulo : "Toqia",
    robots: { index: false, follow: false },
  };
}

export default async function EstadoPulseraPage({
  params,
  searchParams,
}: {
  params: Promise<{ estado: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { estado } = await params;
  const { c: codigo } = await searchParams;

  if (!isEstado(estado)) notFound();

  const { titulo, detalle, accion } = ESTADOS[estado];

  return (
    <main className="tq-page flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[440px]">
        <div className="rounded-2xl border border-tq-gold/40 bg-tq-surface px-6 py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tq-gold">
            Toqia
          </p>

          <h1 className="mt-6 text-xl font-semibold tracking-tight text-tq-text">
            {titulo}
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-tq-text-muted">{detalle}</p>

          <div className="tq-divider my-7" />

          <p className="text-sm text-tq-text-muted">{accion}</p>

          {codigo ? (
            <p className="mt-7 inline-flex items-center gap-2 rounded-lg border border-tq-border px-3 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-tq-text-muted">
                Código
              </span>
              <span className="font-mono text-xs text-tq-gold">{codigo}</span>
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-tq-text-muted/70">
          No hace falta que hagas nada más.
        </p>
      </div>
    </main>
  );
}
