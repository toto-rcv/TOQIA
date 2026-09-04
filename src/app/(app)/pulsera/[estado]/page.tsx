import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

/**
 * Páginas de caso borde del escaneo.
 *
 * Comparten la estética de la landing (negro con dorado) para que el cliente
 * no sienta que se rompió algo distinto. Nunca muestran un error técnico: la
 * persona no puede hacer nada con esa información, así que le decimos qué pasó
 * y a quién avisar.
 *
 * Los textos están traducidos igual que la landing: quien llega acá es la
 * misma persona que apoyó el celular, y llevarla de una página en su idioma a
 * una pantalla de error en castellano es justo el momento en que no conviene
 * confundirla más.
 */

/**
 * Los estados válidos. El contenido de cada uno vive en `messages/*.json`
 * bajo `Pulsera.<estado>`; acá queda solo la lista, que es lo que decide si la
 * URL existe o es un 404.
 */
const ESTADOS = [
  "no-reconocida",
  "inactiva",
  "error",
  "sin-asignar",
  "sin-destino",
] as const;

type Estado = (typeof ESTADOS)[number];

function isEstado(value: string): value is Estado {
  return (ESTADOS as readonly string[]).includes(value);
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ estado: string }>;
}): Promise<Metadata> {
  const { estado } = await params;
  if (!isEstado(estado)) {
    return { title: { absolute: "Toqia" }, robots: { index: false, follow: false } };
  }

  const t = await getTranslations("Pulsera");
  return {
    title: { absolute: t(`${estado}.titulo`) },
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
  const [{ estado }, { c: codigo }] = await Promise.all([params, searchParams]);

  if (!isEstado(estado)) notFound();

  const [idioma, t] = await Promise.all([getLocale(), getTranslations("Pulsera")]);

  return (
    <main
      className="tq-page flex items-center justify-center px-5 py-16"
      lang={idioma}
    >
      <div className="w-full max-w-[440px]">
        <div className="rounded-2xl border border-tq-gold/40 bg-tq-surface px-6 py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tq-gold">
            Toqia
          </p>

          <h1 className="mt-6 text-xl font-semibold tracking-tight text-tq-text">
            {t(`${estado}.titulo`)}
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-tq-text-muted">
            {t(`${estado}.detalle`)}
          </p>

          <div className="tq-divider my-7" />

          <p className="text-sm text-tq-text-muted">{t(`${estado}.accion`)}</p>

          {codigo ? (
            <p className="mt-7 inline-flex items-center gap-2 rounded-lg border border-tq-border px-3 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-tq-text-muted">
                {t("codigo")}
              </span>
              <span className="font-mono text-xs text-tq-gold">{codigo}</span>
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-tq-text-muted/70">
          {t("nadaMas")}
        </p>
      </div>
    </main>
  );
}
