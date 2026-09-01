"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { SECCIONES } from "./config";
import { MarcaLink } from "./marca";

export function NavSitio({ ctaHref }: { ctaHref: string }) {
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

    for (const { id } of SECCIONES) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

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
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-6 px-5 lg:h-[92px] lg:px-8">
        <MarcaLink />

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {SECCIONES.map((s) => (
              <li key={s.id}>
                <EnlaceSeccion seccion={s} activa={activa === s.id} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a href={ctaHref} className="mk-btn-outline hidden lg:inline-flex">
            Quiero Toqia
          </a>

          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-movil"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
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
          {SECCIONES.map((s) => (
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
            Quiero Toqia
          </a>
        </div>
      </div>
    </header>
  );
}

function EnlaceSeccion({
  seccion,
  activa,
}: {
  seccion: (typeof SECCIONES)[number];
  activa: boolean;
}) {
  return (
    <a
      href={seccion.href}
      aria-current={activa ? "true" : undefined}
      className={cn(
        "relative block py-2 text-[15px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-turquoise focus-visible:ring-offset-4 focus-visible:ring-offset-mk-bg",
        activa ? "text-mk-text" : "text-mk-muted hover:text-mk-text"
      )}
    >
      {seccion.label}
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
