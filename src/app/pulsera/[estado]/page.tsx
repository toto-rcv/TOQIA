import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Páginas de caso borde del escaneo.
 *
 * Estas son las únicas pantallas del sistema que ve un cliente del
 * restaurante, y las ve parado con el celular en la mano. Siguen el protocolo
 * minimalist-ui: fondo cálido, tipografía editorial, nada de decoración.
 *
 * Nunca muestran un stack trace ni un código de error: la persona no puede
 * hacer nada con esa información. Le decimos qué pasó y a quién avisar.
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
    detalle:
      "La pulsera está activa pero todavía no tiene cargado a dónde llevarte.",
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
    title: contenido ? contenido.titulo : "Pulsera NFC",
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
    <main className="mn-page flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl animate-fade-up">
        <div className="mn-card px-8 py-12 sm:px-12 sm:py-16">
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.14em] text-mn-ink-muted">
            Pulsera NFC
          </p>

          <h1 className="mn-title text-3xl sm:text-4xl">{titulo}</h1>

          <p className="mn-body mt-6 max-w-prose text-base">{detalle}</p>

          <div className="mt-10 border-t border-mn-border pt-6">
            <p className="text-sm text-mn-ink-soft">{accion}</p>
          </div>

          {codigo ? (
            <div className="mt-8 inline-flex items-center gap-3 bg-mn-yellow px-3 py-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-mn-ink-muted">
                Código
              </span>
              <span className="font-mono text-sm text-mn-ink">{codigo}</span>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center font-mono text-[11px] tracking-[0.1em] text-mn-ink-muted">
          No hace falta que hagas nada más.
        </p>
      </div>
    </main>
  );
}
