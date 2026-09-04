import { ChevronDown } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { BANDERAS } from "@/components/ui/banderas";
import { inicioDelSitio } from "@/i18n/rutas";
import { IDIOMAS, NOMBRE_DE_IDIOMA, type Idioma } from "@/i18n/locales";

/**
 * El selector de idioma del sitio comercial.
 *
 * Distinto del de la landing, y por un motivo concreto: acá el idioma vive en
 * la URL (`/es`, `/en`, `/it`…), así que cambiarlo es **navegar**, no guardar
 * una preferencia. Son siete enlaces a la misma página en otro idioma, que es
 * además lo que Google espera encontrar para entender que son la misma página.
 *
 * Son `<a>` y no el `Link` de next-intl: cambiar de idioma cambia el documento
 * entero —incluido el `lang` del `<html>`— así que una carga completa es lo
 * correcto, y de paso evita montar el proveedor de next-intl en el navegador
 * solo para resolver siete direcciones que el servidor ya conoce.
 *
 * **Es un desplegable y no una fila de banderas.** Con tres idiomas la fila
 * entraba y se leía de un vistazo; con siete son 240px que no caben al lado
 * del logo en un celular. Se hace con `<details>`, que abre y cierra sin una
 * línea de JavaScript: esta página tiene un solo componente cliente y no vale
 * la pena sumarle otro por un menú de siete elementos.
 */
export async function SelectorIdiomaSitio() {
  const [actual, t] = await Promise.all([getLocale(), getTranslations("Idioma")]);
  const BanderaActual = BANDERAS[actual as Idioma] ?? BANDERAS.es;

  return (
    <details className="group relative">
      <summary
        aria-label={t("elegir")}
        className="flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill border border-mk-border bg-mk-surface px-2.5 transition-colors hover:border-mk-turquoise/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-turquoise [&::-webkit-details-marker]:hidden"
      >
        <BanderaActual />
        <ChevronDown
          className="size-4 text-mk-muted transition-transform group-open:rotate-180"
          strokeWidth={2}
          aria-hidden
        />
      </summary>

      {/* Alineado a la derecha: nace del borde derecho de la barra y crece
          hacia adentro, así nunca se sale de la pantalla en un celular. */}
      <ul className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[190px] overflow-hidden rounded-card border border-mk-border bg-mk-surface py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
        {IDIOMAS.map((idioma) => {
          const esActual = idioma === (actual as Idioma);
          const Bandera = BANDERAS[idioma];

          return (
            <li key={idioma}>
              <a
                href={inicioDelSitio(idioma)}
                hrefLang={idioma}
                lang={idioma}
                aria-current={esActual ? "true" : undefined}
                className={
                  "flex min-h-[44px] items-center gap-3 px-4 text-[14px] transition-colors " +
                  (esActual
                    ? "bg-mk-elevated font-medium text-mk-text"
                    : "text-mk-muted hover:bg-mk-elevated hover:text-mk-text")
                }
              >
                <Bandera />
                {NOMBRE_DE_IDIOMA[idioma]}
              </a>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
