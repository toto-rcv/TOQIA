import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

/**
 * **El matcher es una lista blanca, y eso es lo importante de este archivo.**
 *
 * Lo habitual es excluir con una expresión negativa ("todo menos /api y
 * /_next"). Acá no: el middleware corre antes de cada pedido que abarque, y
 * `/r/[code]` es el destino de un toque de pulsera — la pantalla que tiene que
 * abrir lo más rápido posible, muchas veces con una barra de señal. No hay
 * ninguna razón para hacerle pagar un salto extra, y una expresión negativa
 * mal escrita la incluiría sin que nadie se entere hasta que un cliente se
 * queje de que la página tarda.
 *
 * Entonces solo entran las rutas del sitio comercial: la raíz —que redirige al
 * idioma del visitante— y las siete prefijadas.
 *
 * Los paneles, el login, `/empresa`, `/api`, `/pulsera` y `/r` no pasan por
 * acá: su idioma se resuelve dentro del render, en `src/i18n/request.ts`.
 *
 * Nota histórica, por si alguien piensa en volver a `localePrefix:
 * "as-needed"`: con esa configuración, para servir `/` el middleware reescribe
 * internamente a `/es`, y en el build de producción esa reescritura vuelve a
 * entrar acá y dispara un bucle infinito de redirecciones. En `next dev` no
 * pasa. Con `"always"` no hay reescritura interna y el problema no existe.
 */
export const config = {
  matcher: ["/", "/(es|en|it|fr|de|nl|ru)", "/(es|en|it|fr|de|nl|ru)/:path*"],
};
