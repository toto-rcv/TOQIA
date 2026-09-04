import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navegacion";
import { IDIOMAS } from "@/i18n/locales";
import { sitioUrl } from "@/lib/utils";

/**
 * Una sola página pública, pero en tres idiomas y tres URLs.
 *
 * Cada entrada declara sus alternativas: es la misma información que el
 * `hreflang` del `<head>`, repetida acá porque Google acepta las dos vías y
 * tenerlas de acuerdo es lo que evita que trate `/en` y `/it` como contenido
 * duplicado de `/`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = sitioUrl();
  const url = (idioma: (typeof IDIOMAS)[number]) =>
    `${base}${getPathname({ href: "/", locale: idioma })}`;

  const languages = Object.fromEntries(IDIOMAS.map((i) => [i, url(i)]));

  return IDIOMAS.map((idioma) => ({
    url: url(idioma),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: idioma === "es" ? 1 : 0.8,
    alternates: { languages },
  }));
}
