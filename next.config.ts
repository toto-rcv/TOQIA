import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' empaqueta el server + solo las dependencias que realmente se usan
  // en .next/standalone. Es lo que se copia al VPS y lo que arranca PM2.
  output: "standalone",

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

export default nextConfig;
