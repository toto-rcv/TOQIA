import type { NextRequest } from "next/server";

import { markReviewClick } from "@/lib/scan-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marca que un escaneo terminó en la reseña de Google.
 *
 * Lo llama la landing con `sendBeacon` justo antes de irse a Google. Es un
 * endpoint público a propósito: del otro lado hay un cliente del restaurante,
 * no un usuario logueado.
 *
 * Lo único que acepta es un token de escaneo, que es un UUID aleatorio. No
 * revela nada ni permite modificar nada más que la marca de clic del escaneo
 * que le corresponde, y solo la primera vez.
 *
 * Siempre responde 204, incluso ante un token inválido: no tiene sentido
 * devolverle un error a alguien que ya se está yendo de la página, y responder
 * distinto según el token permitiría adivinar cuáles existen.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    const token =
      typeof body === "object" &&
      body !== null &&
      "token" in body &&
      typeof (body as { token: unknown }).token === "string"
        ? (body as { token: string }).token
        : null;

    // Los tokens son UUID v4. Descartamos cualquier cosa que no tenga esa
    // forma sin siquiera consultar la base.
    if (token && /^[0-9a-f-]{36}$/i.test(token)) {
      await markReviewClick(token);
    }
  } catch (error) {
    console.error("[review-click] no se pudo procesar el aviso", error);
  }

  return new Response(null, { status: 204 });
}
