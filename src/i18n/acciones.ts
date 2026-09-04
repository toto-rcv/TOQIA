"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  COOKIE_IDIOMA,
  COOKIE_IDIOMA_MAX_AGE,
  esIdioma,
} from "./locales";

/**
 * Guarda el idioma elegido y vuelve a la página donde estaba la persona.
 *
 * Es una Server Action y no un `onClick` a propósito: Next las envía por
 * formulario cuando el JavaScript todavía no cargó, así que el selector
 * funciona igual en un celular con la señal justa parado en la puerta de un
 * restaurante — que es exactamente el escenario de esta página.
 */
export async function cambiarIdioma(formData: FormData) {
  const idioma = String(formData.get("idioma") ?? "");
  const volverA = destinoInterno(String(formData.get("volverA") ?? ""));

  if (esIdioma(idioma)) {
    const store = await cookies();
    store.set(COOKIE_IDIOMA, idioma, {
      path: "/",
      maxAge: COOKIE_IDIOMA_MAX_AGE,
      sameSite: "lax",
      // No lleva `httpOnly`: no es un dato sensible y no hay motivo para
      // esconderlo. Tampoco `secure`, para que siga funcionando cuando se
      // prueba desde el celular contra la IP de la LAN, por http.
    });
  }

  redirect(volverA);
}

/**
 * El destino del redirect sale de un campo del formulario, así que hay que
 * tratarlo como lo que es: entrada del usuario. Solo se aceptan rutas propias.
 *
 * `//otro-sitio.com` es una URL absoluta protocol-relative aunque empiece con
 * barra: sin este filtro, alguien podría armar un formulario que use nuestro
 * dominio para rebotar a cualquier lado.
 */
function destinoInterno(valor: string): string {
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/";
  return valor;
}
