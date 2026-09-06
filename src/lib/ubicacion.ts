"use server";

import { cookies } from "next/headers";
import tzlookup from "tz-lookup";

import {
  COOKIE_TIME_ZONE,
  COOKIE_TIME_ZONE_MAX_AGE,
  isValidTimeZone,
} from "./timezone";

/**
 * Recibe la posición que dio el navegador (`navigator.geolocation`) y guarda
 * el huso horario que le corresponde, para que el resto del panel muestre
 * las fechas en la hora de quien está mirando y no siempre en la de
 * Argentina.
 *
 * La llama `TimezoneLocator` (`@/components/layout/timezone-locator`) como
 * una función común desde el cliente — no hace falta un `<form>`, Next la
 * manda igual como Server Action.
 *
 * `tz-lookup` resuelve el huso a partir de las coordenadas con los polígonos
 * de husos horarios ya empaquetados: no hay pedido a ningún servicio externo
 * ni clave de API de por medio, así que esto no depende de que el hosting
 * tenga salida a internet.
 */
export async function guardarUbicacion(lat: number, lon: number): Promise<void> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

  let zonaHoraria: string;
  try {
    zonaHoraria = tzlookup(lat, lon);
  } catch {
    // Coordenadas en medio del océano u otro punto sin huso asignado: se
    // sigue mostrando el default (Argentina) en vez de romper el guardado.
    return;
  }

  if (!isValidTimeZone(zonaHoraria)) return;

  const store = await cookies();
  store.set(COOKIE_TIME_ZONE, zonaHoraria, {
    path: "/",
    maxAge: COOKIE_TIME_ZONE_MAX_AGE,
    sameSite: "lax",
    // Mismo criterio que la cookie de idioma: no es un dato sensible, no
    // hace falta esconderlo del cliente.
  });
}
