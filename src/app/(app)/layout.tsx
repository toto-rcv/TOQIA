import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

// Anton, la tipografía de los títulos de la carta. Viene como paquete de npm
// con el .woff2 adentro, así que se sirve desde nuestro propio dominio: ni el
// build ni el navegador del cliente le piden nada a Google.
import "@fontsource/anton/latin-400.css";
import "../globals.css";

import { sitioUrl } from "@/lib/utils";

/**
 * El layout de todo lo que no es el sitio comercial: los tres paneles, el
 * login, la landing del restaurante, la carta y las pantallas de estado.
 *
 * Son **dos layouts raíz**, no uno. El grupo `(app)` y el grupo `(sitio)`
 * tienen cada uno su `<html>`, y ninguno de los dos cuelga del otro. El motivo
 * es el atributo `lang`: el sitio comercial existe en tres idiomas y su `<html
 * lang>` tiene que decir cuál es, mientras que esta mitad es siempre en
 * castellano en su chrome. Con un solo layout arriba habría que leer el idioma
 * del pedido para decidirlo, y eso volvería dinámica la home comercial, que
 * hoy se prerenderiza estática en los tres idiomas.
 *
 * Los paréntesis no aparecen en la URL: `/admin` sigue siendo `/admin`.
 */

export const metadata: Metadata = {
  // `template` deja que cada página ponga solo su nombre. El `default` es para
  // las pocas pantallas de esta mitad que no declaran título propio.
  title: { default: "Toqia", template: "%s · Toqia" },
  metadataBase: new URL(sitioUrl()),
  // El noindex no se declara global: lo pone cada sección en su propio layout,
  // más src/app/robots.ts. Ver la nota en el layout del sitio comercial.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // La landing se abre casi siempre desde un celular.
  themeColor: "#070A0F",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      {/* Varias extensiones de Chrome (ColorZilla, gestores de contraseñas,
          traductores) le agregan atributos al <body> antes de que React
          hidrate, y React lo reporta como un error de hidratación que no es
          culpa de la app y que el usuario no puede arreglar. Esto silencia la
          comparación en este nodo puntual, no en el resto del árbol. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
