import type { Viewport } from "next";
import {
  ArrowRight,
  Clock,
  ConciergeBell,
  Globe,
  ListChecks,
  Megaphone,
  ShieldCheck,
  SmartphoneNfc,
  Smile,
  Star,
  Tag,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";

import { NavSitio } from "@/components/sitio/nav-sitio";
import { PieSitio } from "@/components/sitio/pie-sitio";
import { enlaceDeContacto } from "@/components/sitio/config";

/**
 * El sitio público de Toqia.
 *
 * Es la única página que se indexa y la única que ve alguien que todavía no es
 * cliente. La entrada al sistema vive en /empresa; los paneles, en /admin,
 * /panel y /distribuidor.
 *
 * Todo el ambiente usa el prefijo `mk-*` (ver tailwind.config.ts). El
 * degradado de marca aparece solo en el logo, los botones y los filetes de
 * cada título: el resto es fondo oscuro y tipografía.
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050B12",
};

export default function SitioToqia() {
  const cta = enlaceDeContacto();

  return (
    <div className="mk-scope min-h-dvh bg-mk-bg text-mk-text antialiased">
      <NavSitio ctaHref={cta} />

      {/* pt: la barra es fija y no ocupa lugar en el flujo. */}
      <main className="pt-[72px] lg:pt-[92px]">
        <Hero cta={cta} />
        <AsiFunciona />
        <QueMuestra />
        <Beneficios />
        <Cierre cta={cta} />
      </main>

      <PieSitio />
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function Hero({ cta }: { cta: string }) {
  return (
    <section id="inicio" className="relative overflow-hidden">
      {/* El resplandor detrás de la pulsera. Son dos manchas difuminadas y no
          una imagen: pesan cero y acompañan al degradado de la marca. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute right-[-15%] top-[-25%] h-[150%] w-[85%] bg-[radial-gradient(closest-side,rgba(22,119,255,0.22),rgba(22,119,255,0.07),transparent)] lg:w-[65%]" />
        <div className="absolute bottom-[-20%] right-[10%] h-[90%] w-[55%] bg-[radial-gradient(closest-side,rgba(0,208,132,0.16),transparent)]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8 lg:px-8 lg:pb-24 lg:pt-16">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-mk-turquoise">
            Cómo funciona
          </p>

          <h1 className="mt-5 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[52px] lg:text-[58px]">
            Tu negocio,
            <br />
            a un <span className="text-mk-turquoise">toque.</span>
          </h1>

          <p className="mt-6 max-w-[36ch] text-[16px] leading-[1.65] text-mk-muted sm:text-[17px]">
            Conecta a tus clientes con lo más importante de tu negocio de forma
            rápida, moderna y sin complicaciones.
          </p>

          <a href={cta} className="mk-btn mt-9 w-full sm:w-auto">
            Quiero Toqia
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
          </a>
        </div>

        {/* La pulsera real: negra, sin marca. Es la que recibe el cliente. */}
        <div className="relative order-first lg:order-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pulsera-nfc.webp"
            alt="Pulsera NFC negra de Toqia, con el símbolo de contacto sin contacto en el disco central."
            width={1280}
            height={827}
            /* Es la imagen que define el primer pantallazo: sin esto el
               navegador la pone en la cola detrás de las fuentes. */
            fetchPriority="high"
            className="mx-auto w-full max-w-[560px] select-none lg:max-w-none"
          />
        </div>
      </div>
    </section>
  );
}

/* ── Así funciona ─────────────────────────────────────────────────────────── */

const PASOS = [
  {
    icono: SmartphoneNfc,
    color: "#1677FF",
    titulo: "Toca o escanea",
    texto:
      "El cliente acerca su móvil a tu pulsera, tarjeta o soporte con tecnología NFC.",
  },
  {
    icono: Globe,
    color: "#00B8C8",
    titulo: "Accede al instante",
    texto:
      "Se abre tu página personalizada al momento, sin necesidad de aplicaciones.",
  },
  {
    icono: ListChecks,
    color: "#00D084",
    titulo: "Interactúa",
    texto:
      "El cliente consulta tu menú, lista de precios, servicios, promociones o deja su reseña.",
  },
] as const;

function AsiFunciona() {
  return (
    <Seccion id="como-funciona" titulo="Así funciona">
      {/* Cinco columnas en escritorio: paso, guion, paso, guion, paso. En el
          celular la grilla cae a una sola columna y los guiones se ocultan —
          una línea punteada entre dos tarjetas apiladas no une nada. */}
      <ol className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:gap-6">
        {PASOS.map((paso, i) => (
          <Paso key={paso.titulo} paso={paso} numero={i + 1} ultimo={i === PASOS.length - 1} />
        ))}
      </ol>
    </Seccion>
  );
}

function Paso({
  paso,
  numero,
  ultimo,
}: {
  paso: (typeof PASOS)[number];
  numero: number;
  ultimo: boolean;
}) {
  const Icono = paso.icono;

  return (
    <>
      <li className="flex flex-col items-center text-center">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full border border-mk-border bg-mk-surface text-[14px] font-medium text-mk-text"
        >
          {numero}
        </span>

        <span
          aria-hidden
          className="mt-6 flex h-20 w-20 items-center justify-center rounded-full border border-mk-border bg-mk-surface"
        >
          <Icono
            className="h-8 w-8"
            strokeWidth={1.5}
            style={{ color: paso.color }}
          />
        </span>

        <h3 className="mt-6 text-[18px] font-semibold tracking-[-0.01em]">
          {/* El número también en el texto, para un lector de pantalla: el
              círculo de arriba es decorativo. */}
          <span className="sr-only">Paso {numero}: </span>
          {paso.titulo}
        </h3>
        <p className="mt-3 max-w-[34ch] text-[14px] leading-[1.6] text-mk-muted">
          {paso.texto}
        </p>
      </li>

      {ultimo ? null : (
        <span
          aria-hidden
          /* mt: 40px del círculo del número + 24px de aire + 40px hasta el
             centro del círculo del icono. */
          className="mt-[6.5rem] hidden w-16 border-t border-dashed border-mk-border sm:block lg:w-36"
        />
      )}
    </>
  );
}

/* ── Qué puede mostrar tu página ──────────────────────────────────────────── */

const CAPACIDADES = [
  { icono: UtensilsCrossed, color: "#1677FF", label: "Menú digital" },
  { icono: Tag, color: "#0B97E3", label: "Lista de precios" },
  { icono: ConciergeBell, color: "#00B8C8", label: "Servicios" },
  { icono: Megaphone, color: "#00C4A6", label: "Promociones" },
  { icono: Star, color: "#00D084", label: "Reseñas" },
] as const;

function QueMuestra() {
  return (
    <Seccion id="que-muestra" titulo="Qué puede mostrar tu página">
      {/* Dos columnas en el celular y cinco en escritorio. Con cinco tarjetas,
          el paso intermedio de tres deja una fila de dos: es preferible a
          apilarlas de a una y hacer scrollear la sección entera. */}
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {CAPACIDADES.map((c) => {
          const Icono = c.icono;
          return (
            <li
              key={c.label}
              className="mk-card flex flex-col items-center justify-center gap-4 px-3 py-8"
            >
              <Icono
                className="h-8 w-8"
                strokeWidth={1.5}
                style={{ color: c.color }}
                aria-hidden
              />
              <span className="text-center text-[14px] text-mk-text">
                {c.label}
              </span>
            </li>
          );
        })}
      </ul>
    </Seccion>
  );
}

/* ── Beneficios ───────────────────────────────────────────────────────────── */

const BENEFICIOS = [
  {
    icono: TrendingUp,
    color: "#1677FF",
    titulo: "Más visibilidad",
    texto: "Aumenta reseñas y recomendaciones.",
  },
  {
    icono: Clock,
    color: "#07A2DA",
    titulo: "Ahorra tiempo",
    texto: "Información siempre actualizada.",
  },
  {
    icono: Smile,
    color: "#00C0B1",
    titulo: "Mejor experiencia",
    texto: "Tus clientes acceden a todo de forma rápida y cómoda.",
  },
  {
    icono: ShieldCheck,
    color: "#00D084",
    titulo: "Imagen profesional",
    texto: "Tecnología moderna que potencia tu marca.",
  },
] as const;

function Beneficios() {
  return (
    <Seccion id="beneficios" titulo="Beneficios para tu negocio">
      <ul className="mt-10 grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFICIOS.map((b) => {
          const Icono = b.icono;
          return (
            <li
              key={b.titulo}
              /* El divisor separa columnas, nunca filas: se pide por posición
                 en la grilla, no por índice en el array. Con dos columnas lo
                 llevan el 2º y el 4º; con cuatro, todos menos el primero. Un
                 `i > 0` a secas le dejaba un filete suelto al 3º cuando abría
                 la segunda fila en tablet. */
              className="flex flex-col items-center border-mk-border px-6 text-center sm:[&:nth-child(even)]:border-l lg:[&:nth-child(n+2)]:border-l"
            >
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full border border-mk-border bg-mk-surface"
              >
                <Icono
                  className="h-[22px] w-[22px]"
                  strokeWidth={1.5}
                  style={{ color: b.color }}
                />
              </span>
              <h3 className="mt-5 text-[15px] font-semibold">{b.titulo}</h3>
              <p className="mt-2 max-w-[26ch] text-[13px] leading-[1.6] text-mk-muted">
                {b.texto}
              </p>
            </li>
          );
        })}
      </ul>
    </Seccion>
  );
}

/* ── Cierre ───────────────────────────────────────────────────────────────── */

function Cierre({ cta }: { cta: string }) {
  return (
    <section id="contacto" className="mx-auto max-w-6xl px-5 pb-20 pt-4 lg:px-8 lg:pb-28">
      <div className="flex flex-col gap-8 rounded-card border border-mk-border bg-mk-surface px-6 py-9 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-12 lg:py-11">
        <div>
          <h2 className="text-[26px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[30px]">
            ¿Listo para llevar tu negocio
            <br className="hidden sm:block" />{" "}
            al <span className="text-mk-turquoise">siguiente nivel</span>?
          </h2>
          <p className="mt-3 text-[15px] text-mk-muted">
            Un toque, infinitas posibilidades.
          </p>
        </div>

        <a href={cta} className="mk-btn w-full shrink-0 lg:w-auto lg:px-10 lg:text-[17px]">
          Quiero Toqia
          <ArrowRight className="h-5 w-5" strokeWidth={2} />
        </a>
      </div>
    </section>
  );
}

/* ── Piezas comunes ───────────────────────────────────────────────────────── */

/** Título centrado con el filete de marca debajo, y el ancla de la sección. */
function Seccion({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-14">
      <h2 className="text-center text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">
        {titulo}
      </h2>
      <div aria-hidden className="mk-rule" />
      {children}
    </section>
  );
}
