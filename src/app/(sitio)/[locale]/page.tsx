import type React from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
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
import { SelectorIdiomaSitio } from "@/components/sitio/selector-idioma-sitio";
import { SECCIONES, enlaceDeContacto } from "@/components/sitio/config";
import { inicioDelSitio } from "@/i18n/rutas";
import { routing } from "@/i18n/routing";

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
 *
 * Existe en siete idiomas: `/es`, `/en`, `/it`, `/fr`, `/de`, `/nl`, `/ru`.
 * La raíz `/` redirige al idioma del visitante. Las siete variantes se generan
 * en el build — `setRequestLocale` es lo que lo permite: sin él, leer el
 * idioma del pedido volvería dinámica la página y rompería la prerenderización.
 */

export default async function SitioToqia({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // El layout también lo valida, pero layout y página se renderizan a la vez:
  // sin esta guarda, `/de` explota acá con un 500 antes de que el layout
  // llegue a devolver el 404.
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Una sola resolución de traducciones para toda la página: cada subcomponente
  // recibe los textos que necesita como prop en vez de llamar a getTranslations
  // por su cuenta. Así se evitan múltiples roundtrips al caché de next-intl
  // durante el render del árbol, que en dev se acumulan y suman latencia.
  const [t, tMustra, tBeneficios] = await Promise.all([
    getTranslations("Sitio"),
    getTranslations("Sitio.muestra"),
    getTranslations("Sitio.beneficios"),
  ]);
  const cta = enlaceDeContacto(t("mensajeWhatsapp"));

  return (
    <div className="mk-scope min-h-dvh bg-mk-bg text-mk-text antialiased">
      <NavSitio
        secciones={SECCIONES.map((s) => ({
          id: s.id,
          href: s.href,
          label: t(`nav.${s.clave}`),
        }))}
        inicioHref={inicioDelSitio(locale)}
        ctaHref={cta}
        ctaLabel={t("cta")}
        etiquetas={{
          principal: t("nav.principal"),
          abrir: t("nav.abrir"),
          cerrar: t("nav.cerrar"),
        }}
        /* El selector es un componente de servidor: se le pasa ya renderizado
           para que la barra siga sin cargar traducciones en el navegador. */
        selector={<SelectorIdiomaSitio />}
      />

      {/* pt: la barra es fija y no ocupa lugar en el flujo. */}
      <main className="pt-[72px] lg:pt-[92px]">
        <Hero
          cta={cta}
          kicker={t("hero.kicker")}
          tituloRich={t.rich("hero.titulo", {
            salto: () => <br />,
            destacado: (texto) => (
              <span className="text-mk-turquoise">{texto}</span>
            ),
          })}
          texto={t("hero.texto")}
          ctaLabel={t("cta")}
          altPulsera={t("hero.altPulsera")}
        />
        <AsiFunciona
          titulo={t("pasos.titulo")}
          etiquetaNumero={(n: number) => t("pasos.numero", { n })}
          pasosTitulos={PASOS.map((p) => t(`pasos.${p.clave}.titulo`))}
          pasosTextos={PASOS.map((p) => t(`pasos.${p.clave}.texto`))}
        />
        <QueMuestra
          titulo={tMustra("titulo")}
          capacidades={CAPACIDADES.map((c) => ({
            ...c,
            label: tMustra(c.clave),
          }))}
        />
        <Beneficios
          titulo={tBeneficios("titulo")}
          items={BENEFICIOS.map((b) => ({
            ...b,
            titulo: tBeneficios(`${b.clave}.titulo`),
            texto: tBeneficios(`${b.clave}.texto`),
          }))}
        />
        <Cierre
          cta={cta}
          tituloRich={t.rich("cierre.titulo", {
            salto: () => <br className="hidden sm:block" />,
            destacado: (texto) => (
              <span className="text-mk-turquoise">{texto}</span>
            ),
          })}
          texto={t("cierre.texto")}
          ctaLabel={t("cta")}
        />
      </main>

      <PieSitio />
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function Hero({
  cta,
  kicker,
  tituloRich,
  texto,
  ctaLabel,
  altPulsera,
}: {
  cta: string;
  kicker: string;
  tituloRich: React.ReactNode;
  texto: string;
  ctaLabel: string;
  altPulsera: string;
}) {
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
            {kicker}
          </p>

          {/* Texto con formato en vez de tres claves sueltas: así el traductor
              puede mover el salto y el resaltado a donde su idioma los pida,
              en lugar de tener que respetar el orden del castellano. */}
          <h1 className="mt-5 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[52px] lg:text-[58px]">
            {tituloRich}
          </h1>

          <p className="mt-6 max-w-[36ch] text-[16px] leading-[1.65] text-mk-muted sm:text-[17px]">
            {texto}
          </p>

          <a href={cta} className="mk-btn mt-9 w-full sm:w-auto">
            {ctaLabel}
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
          </a>
        </div>

        {/* La pulsera real: negra, sin marca. Es la que recibe el cliente. */}
        <div className="relative order-first lg:order-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pulsera-nfc.webp"
            alt={altPulsera}
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

/**
 * De cada paso queda acá solo lo que es diseño —el icono y su color— y la
 * clave con la que buscar el texto. Los títulos y descripciones viven en
 * `messages/*.json`: un texto suelto en el código es un texto que se olvida de
 * traducir.
 */
const PASOS = [
  { clave: "1", icono: SmartphoneNfc, color: "#1677FF" },
  { clave: "2", icono: Globe, color: "#00B8C8" },
  { clave: "3", icono: ListChecks, color: "#00D084" },
] as const;

function AsiFunciona({
  titulo,
  etiquetaNumero,
  pasosTitulos,
  pasosTextos,
}: {
  titulo: string;
  etiquetaNumero: (n: number) => string;
  pasosTitulos: string[];
  pasosTextos: string[];
}) {
  return (
    <Seccion id="como-funciona" titulo={titulo}>
      {/* Cinco columnas en escritorio: paso, guion, paso, guion, paso. En el
          celular la grilla cae a una sola columna y los guiones se ocultan —
          una línea punteada entre dos tarjetas apiladas no une nada. */}
      <ol className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:gap-6">
        {PASOS.map((paso, i) => (
          <Paso
            key={paso.clave}
            paso={paso}
            numero={i + 1}
            titulo={pasosTitulos[i]}
            texto={pasosTextos[i]}
            etiquetaNumero={etiquetaNumero(i + 1)}
            ultimo={i === PASOS.length - 1}
          />
        ))}
      </ol>
    </Seccion>
  );
}

function Paso({
  paso,
  numero,
  titulo,
  texto,
  etiquetaNumero,
  ultimo,
}: {
  paso: (typeof PASOS)[number];
  numero: number;
  titulo: string;
  texto: string;
  /** "Paso 2:", para el lector de pantalla. El círculo es decorativo. */
  etiquetaNumero: string;
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
          <span className="sr-only">{etiquetaNumero} </span>
          {titulo}
        </h3>
        <p className="mt-3 max-w-[34ch] text-[14px] leading-[1.6] text-mk-muted">
          {texto}
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
  { clave: "menu", icono: UtensilsCrossed, color: "#1677FF" },
  { clave: "precios", icono: Tag, color: "#0B97E3" },
  { clave: "servicios", icono: ConciergeBell, color: "#00B8C8" },
  { clave: "promociones", icono: Megaphone, color: "#00C4A6" },
  { clave: "resenas", icono: Star, color: "#00D084" },
] as const;

type CapacidadConLabel = (typeof CAPACIDADES)[number] & { label: string };

function QueMuestra({
  titulo,
  capacidades,
}: {
  titulo: string;
  capacidades: CapacidadConLabel[];
}) {
  return (
    <Seccion id="que-muestra" titulo={titulo}>
      {/* Dos columnas en el celular y cinco en escritorio. Con cinco tarjetas,
          el paso intermedio de tres deja una fila de dos: es preferible a
          apilarlas de a una y hacer scrollear la sección entera. */}
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {capacidades.map((c) => {
          const Icono = c.icono;
          return (
            <li
              key={c.clave}
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
  { clave: "visibilidad", icono: TrendingUp, color: "#1677FF" },
  { clave: "tiempo", icono: Clock, color: "#07A2DA" },
  { clave: "experiencia", icono: Smile, color: "#00C0B1" },
  { clave: "imagen", icono: ShieldCheck, color: "#00D084" },
] as const;

type BeneficioConTextos = (typeof BENEFICIOS)[number] & {
  titulo: string;
  texto: string;
};

function Beneficios({
  titulo,
  items,
}: {
  titulo: string;
  items: BeneficioConTextos[];
}) {
  return (
    <Seccion id="beneficios" titulo={titulo}>
      <ul className="mt-10 grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((b) => {
          const Icono = b.icono;
          return (
            <li
              key={b.clave}
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

function Cierre({
  cta,
  tituloRich,
  texto,
  ctaLabel,
}: {
  cta: string;
  tituloRich: React.ReactNode;
  texto: string;
  ctaLabel: string;
}) {
  return (
    <section id="contacto" className="mx-auto max-w-6xl px-5 pb-20 pt-4 lg:px-8 lg:pb-28">
      <div className="flex flex-col gap-8 rounded-card border border-mk-border bg-mk-surface px-6 py-9 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-12 lg:py-11">
        <div>
          <h2 className="text-[26px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[30px]">
            {tituloRich}
          </h2>
          <p className="mt-3 text-[15px] text-mk-muted">{texto}</p>
        </div>

        <a href={cta} className="mk-btn w-full shrink-0 lg:w-auto lg:px-10 lg:text-[17px]">
          {ctaLabel}
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
