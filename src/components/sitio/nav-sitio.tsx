"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * La barra del sitio comercial.
 *
 * Es el único componente cliente de la página —necesita estado para el menú
 * del celular y para saber qué sección se está mirando— y por eso **recibe
 * todos sus textos como props en vez de resolverlos con `useTranslations`**:
 * así el diccionario de traducciones no viaja al navegador. Lo mismo con el
 * selector de idioma, que llega ya renderizado desde el servidor.
 */

export type EnlaceNav = { id: string; href: string; label: string };

export function NavSitio({
  secciones,
  inicioHref,
  ctaHref,
  ctaLabel,
  etiquetas,
  selector,
}: {
  secciones: EnlaceNav[];
  /** El inicio en el idioma actual: "/", "/en" o "/it". */
  inicioHref: string;
  ctaHref: string;
  ctaLabel: string;
  etiquetas: { principal: string; abrir: string; cerrar: string };
  /** El selector de idioma, renderizado en el servidor. */
  selector: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState<string>("inicio");
  const [scrolleada, setScrolleada] = useState(false);

  // El fondo de la barra aparece recién al bajar: sobre el hero se quiere ver
  // el degradado de la imagen, no una banda opaca cortándolo.
  useEffect(() => {
    const alScrollear = () => setScrolleada(window.scrollY > 12);
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  // Qué sección se está mirando. IntersectionObserver y no un cálculo de
  // scroll: no corre en cada píxel y el navegador ya sabe la respuesta.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entradas) => {
        const visible = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiva(visible.target.id);
      },
      // El margen superior descuenta la barra fija; el inferior evita que la
      // sección siguiente se marque activa apenas asoma por abajo.
      { rootMargin: "-96px 0px -55% 0px", threshold: [0.01, 0.25, 0.5] }
    );

    for (const { id } of secciones) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [secciones]);

  // Con el menú abierto no se scrollea el fondo, y Escape lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolleada || abierto
          ? "border-b border-mk-border bg-mk-bg/90 backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-3 px-5 lg:h-[92px] lg:gap-6 lg:px-8">
        <MarcaSlot inicioHref={inicioHref} />

        <nav aria-label={etiquetas.principal} className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {secciones.map((s) => (
              <li key={s.id}>
                <EnlaceSeccion enlace={s} activa={activa === s.id} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 lg:gap-3">
          {selector}

          <a href={ctaHref} className="mk-btn-outline hidden lg:inline-flex">
            {ctaLabel}
          </a>

          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-movil"
            aria-label={abierto ? etiquetas.cerrar : etiquetas.abrir}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-control text-mk-text transition-colors hover:bg-mk-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-turquoise lg:hidden"
          >
            {abierto ? (
              <X className="h-6 w-6" strokeWidth={1.75} />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* El menú del celular. Se despliega debajo de la barra en vez de tapar
          la pantalla entera: son cuatro enlaces, un panel completo sería
          desproporcionado. */}
      <div
        id="menu-movil"
        hidden={!abierto}
        className="border-t border-mk-border bg-mk-bg lg:hidden"
      >
        <ul className="mx-auto max-w-6xl px-5 py-3">
          {secciones.map((s) => (
            <li key={s.id}>
              <a
                href={s.href}
                onClick={() => setAbierto(false)}
                className={cn(
                  "flex min-h-[52px] items-center border-b border-mk-border/70 text-[16px] transition-colors last:border-b-0",
                  activa === s.id
                    ? "text-mk-text"
                    : "text-mk-muted hover:text-mk-text"
                )}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mx-auto max-w-6xl px-5 pb-5">
          <a
            href={ctaHref}
            onClick={() => setAbierto(false)}
            className="mk-btn w-full"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * El hueco de la marca.
 *
 * `MarcaLink` es un componente de servidor y no puede importarse desde acá, así
 * que se dibuja igual pero sin traducciones: es un logo y una palabra, no
 * tiene nada que traducir.
 */
function MarcaSlot({ inicioHref }: { inicioHref: string }) {
  return (
    <a
      href={inicioHref}
      aria-label="Toqia"
      className="inline-flex shrink-0 items-center gap-2.5 rounded-control transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-turquoise focus-visible:ring-offset-4 focus-visible:ring-offset-mk-bg"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/toqia-isotipo.webp"
        alt=""
        aria-hidden
        width={320}
        height={227}
        className="h-8 w-auto select-none"
      />
      <span className="text-[17px] font-medium leading-none tracking-[0.22em] text-mk-text lg:text-[19px]">
        TOQIA
      </span>
    </a>
  );
}

function EnlaceSeccion({
  enlace,
  activa,
}: {
  enlace: EnlaceNav;
  activa: boolean;
}) {
  return (
    <a
      href={enlace.href}
      aria-current={activa ? "true" : undefined}
      className={cn(
        "relative block py-2 text-[15px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-turquoise focus-visible:ring-offset-4 focus-visible:ring-offset-mk-bg",
        activa ? "text-mk-text" : "text-mk-muted hover:text-mk-text"
      )}
    >
      {enlace.label}
      {/* El subrayado del enlace activo. Va siempre en el DOM y solo cambia de
          opacidad: si apareciera y desapareciera, la línea saltaría sin
          transición. */}
      <span
        aria-hidden
        className={cn(
          "absolute -bottom-1 left-0 h-[2px] w-full rounded-pill bg-mk-turquoise transition-opacity duration-200",
          activa ? "opacity-100" : "opacity-0"
        )}
      />
    </a>
  );
}
