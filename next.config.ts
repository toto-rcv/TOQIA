import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Nada de 'output: standalone' acá: ese modo empaqueta el server con una
  // copia recortada de node_modules (pensada para copiar solo esa carpeta a
  // un VPS y arrancarla con PM2). El hosting de Node de Hostinger ya corre
  // el proyecto completo con su propio node_modules, así que ese empaquetado
  // sobra — y de paso tiene un bug conocido: la copia recortada se olvida la
  // carpeta `esm` de @swc/helpers, y el server no arranca
  // ("Cannot find module '.../@swc/helpers/esm/_interop_require_default.js'").
  // Si el día de mañana se vuelve a un VPS con PM2, se puede reactivar acá.

  // El hosting de Node de Hostinger arma su propia carpeta node_modules por
  // build (hbuilds/versions/<uuid>/nodejs/node_modules) a partir de los
  // manifiestos de "output file tracing" que Next genera SIEMPRE al buildear
  // (los .nft.json en .next/), sin importar el `output` de arriba. Ese
  // tracing tiene un bug conocido con @swc/helpers: no detecta el uso de la
  // carpeta esm/ (la resuelve el require-hook de Next en runtime, no un
  // import estático), así que la deja afuera y el server no arranca
  // ("Cannot find module '.../@swc/helpers/esm/_interop_require_default.js'").
  // Se lo forzamos a incluir para todas las rutas.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@swc/helpers/**/*"],
  },

  // El endpoint /r/[code] tiene que ser lo más liviano posible: no queremos que
  // Next agregue headers innecesarios en cada respuesta.
  poweredByHeader: false,

  // Confiamos en el reverse proxy (Caddy) para los headers X-Forwarded-*.
  // Ver src/lib/request-ip.ts para cómo se resuelve la IP real.
  experimental: {
    // Server Actions: el panel las usa para todas las mutaciones.
    // El límite tiene que dar para el formulario de la landing completo, que
    // puede llevar logo + portada + foto de cierre + la carta en PDF de una
    // sola vez. Los límites por archivo (6 MB imagen, 12 MB PDF) están en
    // src/lib/media.ts y son los que dan el mensaje de error entendible.
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

/**
 * next-intl. El plugin encuentra solo `src/i18n/request.ts`, que es donde se
 * resuelve el idioma de cada pedido (cookie → Accept-Language). No hay routing
 * por URL: la dirección de la landing está grabada en el chip y no puede
 * llevar el idioma adentro.
 */
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
