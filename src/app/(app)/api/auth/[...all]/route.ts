import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import {
  claveDeIntento,
  estadoDeIntentos,
  limpiarIntentos,
  registrarFallo,
} from "@/lib/login-throttle";
import { getClientIp } from "@/lib/request-ip";

// Better Auth resuelve acá todas sus rutas: sign-in, sign-out, get-session, etc.
const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

/**
 * El POST pasa por un freno antes de llegar a Better Auth.
 *
 * Solo se frena el ingreso con email y contraseña: cerrar sesión o pedir la
 * sesión actual no tiene sentido limitarlos, y hacerlo rompería la navegación
 * de alguien que simplemente tiene varias pestañas abiertas.
 *
 * El conteo va acá y no adentro de Better Auth porque necesitamos ver el
 * resultado: un pedido rechazado suma un fallo, uno exitoso borra el historial.
 * Desde afuera eso es simplemente mirar el código de estado de la respuesta.
 */
export async function POST(request: Request): Promise<Response> {
  if (!esIngresoConContraseña(request)) {
    return handlers.POST(request);
  }

  // El cuerpo se puede leer una sola vez: se clona para espiar el email y se
  // le pasa el original intacto a Better Auth.
  const email = await leerEmail(request.clone());
  if (!email) return handlers.POST(request);

  const clave = claveDeIntento(getClientIp(request.headers), email);

  const estado = estadoDeIntentos(clave);
  if (estado.bloqueado) {
    return respuestaDeBloqueo(estado.segundosRestantes);
  }

  const respuesta = await handlers.POST(request);

  // 401 es contraseña incorrecta o usuario inexistente. Un 500 no es culpa de
  // quien intenta entrar, así que no suma.
  if (respuesta.status === 401 || respuesta.status === 403) {
    const despues = registrarFallo(clave);
    if (despues.bloqueado) return respuestaDeBloqueo(despues.segundosRestantes);
    return respuesta;
  }

  if (respuesta.ok) limpiarIntentos(clave);

  return respuesta;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── Auxiliares ───────────────────────────────────────────────────────────── */

function esIngresoConContraseña(request: Request): boolean {
  return new URL(request.url).pathname.endsWith("/sign-in/email");
}

async function leerEmail(request: Request): Promise<string | null> {
  try {
    const cuerpo: unknown = await request.json();
    if (typeof cuerpo !== "object" || cuerpo === null) return null;

    const email = (cuerpo as { email?: unknown }).email;
    return typeof email === "string" && email.trim() !== "" ? email : null;
  } catch {
    // Un cuerpo que no es JSON no lo mandó nuestro formulario. Que lo rechace
    // Better Auth, que es quien sabe qué esperaba.
    return null;
  }
}

/**
 * 429 con los segundos que faltan.
 *
 * Van en tres lugares a propósito: en `Retry-After` porque es el header
 * estándar, en `message` porque es lo único que el cliente de Better Auth
 * expone siempre, y en `segundosRestantes` para que el formulario pueda
 * dibujar la cuenta regresiva sin tener que leer el texto.
 */
function respuestaDeBloqueo(segundos: number): Response {
  return Response.json(
    {
      code: "DEMASIADOS_INTENTOS",
      message: `Demasiados intentos fallidos. Probá de nuevo en ${segundos} segundos.`,
      segundosRestantes: segundos,
    },
    {
      status: 429,
      headers: { "Retry-After": String(segundos) },
    }
  );
}
