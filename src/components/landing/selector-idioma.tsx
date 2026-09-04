import { ChevronDown } from "lucide-react";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import { BANDERAS } from "@/components/ui/banderas";
import { cambiarIdioma } from "@/i18n/acciones";
import { IDIOMAS, NOMBRE_DE_IDIOMA, type Idioma } from "@/i18n/locales";

export async function SelectorIdioma({
  volverA,
  tono = "landing",
  align = "right",
}: {
  volverA?: string;
  /** "landing" = dorado sobre la portada. "carta" = champagne sobre el negro. */
  tono?: "landing" | "carta";
  align?: "left" | "right";
}) {
  const [actual, t, reqHeaders] = await Promise.all([
    getLocale(),
    getTranslations("Idioma"),
    headers(),
  ]);

  let targetUrl = volverA;
  if (!targetUrl) {
    const referer = reqHeaders.get("referer");
    if (referer) {
      try {
        const parsed = new URL(referer);
        targetUrl = parsed.pathname + parsed.search;
      } catch {
        targetUrl = "/";
      }
    } else {
      targetUrl = "/";
    }
  }

  const BanderaActual = BANDERAS[actual as Idioma] ?? BANDERAS.es;

  const marco =
    tono === "landing"
      ? "border-tq-gold/45 bg-black/55 text-tq-gold-soft"
      : "border-tq-night-line bg-tq-night-raised text-tq-night-soft";
  const panel =
    tono === "landing"
      ? "border-tq-gold/30 bg-tq-surface"
      : "border-tq-night-line bg-tq-night-raised";
  const opcion =
    tono === "landing"
      ? "text-tq-text-muted hover:bg-tq-elevated hover:text-tq-text"
      : "text-tq-night-soft hover:bg-tq-night hover:text-tq-night-ink";
  const opcionActual =
    tono === "landing"
      ? "bg-tq-elevated font-semibold text-tq-gold"
      : "bg-tq-night font-semibold text-tq-champagne";

  return (
    <details className="group relative">
      <summary
        aria-label={t("elegir")}
        className={`flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-pill border px-2.5 [&::-webkit-details-marker]:hidden ${marco}`}
      >
        <BanderaActual />
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          strokeWidth={2}
          aria-hidden
        />
      </summary>

      <form
        action={cambiarIdioma}
        className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+8px)] z-50 min-w-[190px] overflow-hidden rounded-2xl border py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] ${panel}`}
      >
        <input type="hidden" name="volverA" value={targetUrl} />

        {IDIOMAS.map((idioma) => {
          const esActual = idioma === (actual as Idioma);
          const Bandera = BANDERAS[idioma];

          return (
            <button
              key={idioma}
              type="submit"
              name="idioma"
              value={idioma}
              lang={idioma}
              aria-current={esActual ? "true" : undefined}
              className={
                "flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-[14px] transition-colors " +
                (esActual ? opcionActual : opcion)
              }
            >
              <Bandera />
              {NOMBRE_DE_IDIOMA[idioma]}
            </button>
          );
        })}
      </form>
    </details>
  );
}
