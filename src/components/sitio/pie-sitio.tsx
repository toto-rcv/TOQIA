import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navegacion";
import { SECCIONES } from "./config";
import { MarcaLink } from "./marca";

export async function PieSitio() {
  const t = await getTranslations("Sitio");

  return (
    <footer className="border-t border-mk-border bg-mk-bg">
      <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <MarcaLink />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-mk-muted">
              {t("pie.texto")}
            </p>
          </div>

          <nav aria-label={t("pie.nav")}>
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {SECCIONES.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.href}
                    className="text-[14px] text-mk-muted transition-colors hover:text-mk-text"
                  >
                    {t(`nav.${s.clave}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-mk-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-mk-muted">
            {t("pie.derechos", { año: new Date().getFullYear() })}
          </p>

          <p className="text-[13px] text-mk-muted">
            {t("pie.hechoPor")}{" "}
            {/* Enlace a otro dominio: `noreferrer` además de `noopener`, para
                no anunciarle a surcodes.com desde qué página vino la visita. */}
            <a
              href="https://surcodes.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mk-text transition-colors hover:text-mk-turquoise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-turquoise focus-visible:ring-offset-4 focus-visible:ring-offset-mk-bg"
            >
              Surcodes
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
