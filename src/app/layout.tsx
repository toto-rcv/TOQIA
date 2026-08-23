import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

// Anton, la tipografía de los títulos de la carta. Viene como paquete de npm
// con el .woff2 adentro, así que se sirve desde nuestro propio dominio: ni el
// build ni el navegador del cliente le piden nada a Google.
import "@fontsource/anton/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulseras NFC",
  description: "Sistema de captación de reseñas de Google mediante pulseras NFC.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // El endpoint se abre casi siempre desde un celular.
  themeColor: "#070A0F",
};

export default function RootLayout({
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
