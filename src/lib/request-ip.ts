import type { NextRequest } from "next/server";

/**
 * Extrae la IP del cliente de los headers del reverse proxy.
 *
 * Orden de preferencia:
 *  1. x-forwarded-for  — el estándar de facto. Puede traer una cadena
 *     "cliente, proxy1, proxy2"; el primero es el cliente real.
 *  2. x-real-ip        — lo setea nginx/Caddy en configuraciones simples.
 *  3. cf-connecting-ip — por si algún día se pone Cloudflare adelante.
 *
 * Devuelve null si no hay ninguno (por ejemplo, corriendo en local sin proxy),
 * y en ese caso el escaneo se guarda sin ip_hash.
 */
export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return normalize(first);
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return normalize(realIp.trim());

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return normalize(cfIp.trim());

  return null;
}

/**
 * ::ffff:192.168.0.10 es la misma IP que 192.168.0.10 (IPv4 mapeada en IPv6).
 * Sin normalizar, el mismo cliente generaría dos hashes distintos.
 */
function normalize(ip: string): string | null {
  if (!ip) return null;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mapped ? mapped[1] : ip;
}
