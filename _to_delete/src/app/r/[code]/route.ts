import type { NextRequest } from "next/server";

import { lookupBraceletByCode } from "@/db/queries/bracelets";
import { hashIp } from "@/lib/hash";
import { getCached, setCached } from "@/lib/redirect-cache";
import { getClientIp } from "@/lib/request-ip";
import { recordScan } from "@/lib/scan-logger";

/**
 * GET /r/[code] — el endpoint crítico del sistema.
 *
 * Es un Route Handler y no una página a propósito: devuelve una Response con
 * status 302 sin pasar por el render de React. Nada de meta refresh ni de
 * redirección por JavaScript, que agregan una carga de documento entera.
 *
 * Secuencia:
 *   1. Buscar el código en el caché en memoria (TTL configurable, 60s).
 *   2. Si no está, consultar MySQL y cachear el resultado (incluso el "no
 *      existe", para no repetir la consulta ante escaneos repetidos).
 *   3. Devolver el 302.
 *   4. Recién después, disparar el registro del escaneo sin await.
 */

// Nunca cachear la respuesta: cada escaneo tiene que pasar por acá.
export const dynamic = "force-dynamic";
export const revalidate = 0;
// mysql2 y node:crypto necesitan el runtime de Node, no el de Edge.
export const runtime = "nodejs";

type EdgeCase = "no-reconocida" | "inactiva" | "sin-destino";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await context.params;
  const code = normalizeCode(rawCode);

  if (!code) {
    return edgeCaseResponse(request, "no-reconocida", null);
  }

  let bracelet = getCached(code);

  if (bracelet === undefined) {
    // Miss de caché: vamos a la base. Si la base falla no podemos redirigir a
    // ningún lado, pero tampoco queremos devolver un 500 crudo.
    try {
      bracelet = await lookupBraceletByCode(code);
      setCached(code, bracelet);
    } catch (error) {
      console.error("[/r] fallo la consulta de la pulsera", {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      return edgeCaseResponse(request, "no-reconocida", code);
    }
  }

  if (bracelet === null) {
    return edgeCaseResponse(request, "no-reconocida", code);
  }

  // Pulsera o restaurante dados de baja: misma página, mensaje único.
  if (!bracelet.braceletActive || !bracelet.restaurantActive) {
    return edgeCaseResponse(request, "inactiva", code);
  }

  const destination = sanitizeDestination(bracelet.destinationUrl);
  if (!destination) {
    return edgeCaseResponse(request, "sin-destino", code);
  }

  // ── El redirect sale primero ────────────────────────────────────────────
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: destination,
      // Sin esto, un navegador o un proxy intermedio podría quedarse con la
      // redirección cacheada y dejar de consultar el endpoint. El destino
      // tiene que poder cambiar en cualquier momento.
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });

  // ── El registro va después y sin await ──────────────────────────────────
  // recordScan captura sus propios errores; nunca puede romper el redirect.
  recordScan({
    braceletId: bracelet.braceletId,
    restaurantId: bracelet.restaurantId,
    scannedAt: new Date(), // UTC
    userAgent: request.headers.get("user-agent"),
    ipHash: hashIp(getClientIp(request)),
  });

  return response;
}

/**
 * Los códigos se comparan tal cual están en la base, pero toleramos que el
 * lector NFC agregue espacios o que el código llegue url-encodeado.
 */
function normalizeCode(raw: string | undefined): string | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Un % suelto rompe decodeURIComponent; seguimos con el valor original.
  }
  const trimmed = decoded.trim();
  // Límite defensivo: la columna es varchar(50).
  if (trimmed === "" || trimmed.length > 50) return null;
  return trimmed;
}

/**
 * Solo permitimos http y https.
 *
 * Sin esta validación, alguien con acceso al panel podría dejar un
 * `javascript:` o un `data:` en destination_url y convertir la pulsera en un
 * vector de ataque contra los clientes del restaurante.
 */
function sanitizeDestination(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      console.warn("[/r] destino con protocolo no permitido", {
        protocol: url.protocol,
      });
      return null;
    }
    return url.toString();
  } catch {
    console.warn("[/r] destino no es una URL válida", { destination: trimmed });
    return null;
  }
}

/**
 * Los casos borde no devuelven 500 ni una pantalla en blanco: mandan a una
 * página propia, simple y en castellano, que el cliente ve en el celular.
 */
function edgeCaseResponse(
  request: NextRequest,
  kind: EdgeCase,
  code: string | null
): Response {
  const target = new URL(`/pulsera/${kind}`, request.url);
  if (code) target.searchParams.set("c", code);

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
