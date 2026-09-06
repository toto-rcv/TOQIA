import { cookies } from "next/headers";

import { COOKIE_TIME_ZONE, DEFAULT_TIME_ZONE, isValidTimeZone } from "./timezone";

/**
 * El huso horario de quien está mirando el panel ahora mismo, leído de la
 * cookie que dejó `guardarUbicacion`. Si todavía no se detectó nada (recién
 * entró, geolocalización rechazada o el navegador no la soporta) devuelve el
 * de Argentina — nunca deja el render sin huso horario.
 *
 * Vive separado de `@/lib/timezone` (que solo tiene constantes y una
 * validación, sin nada de Next) porque este archivo importa `next/headers`:
 * si `getViewerTimeZone` estuviera en el mismo archivo que `DEFAULT_TIME_ZONE`,
 * cualquier Client Component que solo necesita esa constante —como
 * `formatDateTime` en `lib/utils.ts`, que se usa desde componentes de
 * servidor y de cliente por igual— arrastraría `next/headers` al bundle del
 * navegador y rompería el build ("next/headers" solo puede importarse en un
 * Server Component).
 *
 * Server-only: usa `cookies()`, así que solo se puede llamar desde un Server
 * Component, una Server Action o un route handler.
 */
export async function getViewerTimeZone(): Promise<string> {
  const store = await cookies();
  const value = store.get(COOKIE_TIME_ZONE)?.value;
  if (value && isValidTimeZone(value)) return value;
  return DEFAULT_TIME_ZONE;
}
