import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import "../../globals.css";

import { getPathname } from "@/i18n/navegacion";
import { IDIOMAS, type Idioma } from "@/i18n/locales";
import { routing } from "@/i18n/routing";
import { sitioUrl } from "@/lib/utils";

/**
 * El layout raíz del sitio comercial. Ver la nota en `(app)/layout.tsx` sobre
 * por qué son dos y no uno.
 */

/**
 * Las siete variantes del sitio (`/es`, `/en`, `/it`, `/fr`, `/de`, `/nl`,
 * `/ru`) se generan en el build a partir de `IDIOMAS`. `setRequestLocale` es
 * lo que lo hace posible: le dice a next-intl cuál es el idioma sin tener que
 * mirar cookies ni headers, que es lo que volvería dinámica la página.
 */
export function generateStaticParams() {
  return IDIOMAS.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050B12",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Sitio.meta" });
  const base = sitioUrl();

  /**
   * `hreflang`. Es la única señal que Google usa de verdad para saber que
   * estas tres URLs son la misma página en distintos idiomas — el atributo
   * `lang` del `<html>` lo ignora. Sin esto trataría a `/en` y a `/it` como
   * contenido duplicado de `/`.
   *
   * `x-default` apunta a `/`, que con `localePrefix: "always"` no es una
   * página sino la puerta que redirige según el idioma del visitante. Es
   * justo lo que `x-default` significa: "para quien no encaje en ninguna de
   * las anteriores, entrá por acá".
   */
  const alternates = Object.fromEntries(
    IDIOMAS.map((idioma) => [
      idioma,
      `${base}${getPathname({ href: "/", locale: idioma })}`,
    ])
  );

  return {
    title: { default: t("titulo"), template: "%s · Toqia" },
    description: t("descripcion"),
    metadataBase: new URL(base),
    alternates: {
      canonical: `${base}${getPathname({ href: "/", locale: locale as Idioma })}`,
      languages: { ...alternates, "x-default": `${base}/` },
    },
  };
}

export default async function SitioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Una URL como /de no existe: mejor un 404 que servirle la home en
  // castellano bajo una dirección que promete alemán.
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
