import type { MetadataRoute } from "next";

import { sitioUrl } from "@/lib/utils";

/**
 * Lo único que se indexa es el sitio comercial de "/".
 *
 * El resto queda fuera por dos motivos distintos: los paneles y el login son
 * privados, y las páginas de `/r/…` son el destino de una pulsera concreta —
 * no tienen sentido como resultado de búsqueda y, si se indexaran, el
 * restaurante aparecería en Google por una URL que no es la suya.
 *
 * Cada una de esas secciones además declara `robots: noindex` en su metadata:
 * el robots.txt evita el rastreo, la etiqueta evita la indexación si alguien
 * llega por un enlace.
 */
export default function robots(): MetadataRoute.Robots {

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/panel",
        "/distribuidor",
        "/empresa",
        "/login",
        "/vista-previa",
        "/r/",
        "/pulsera/",
        "/api/",
      ],
    },
    sitemap: `${sitioUrl()}/sitemap.xml`,
  };
}
