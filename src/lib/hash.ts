import { createHash } from "node:crypto";

import { env } from "./env";

/**
 * Devuelve SHA-256(salt + ip) en hexadecimal (64 caracteres).
 *
 * Nunca guardamos la IP en claro. El salt viene de IP_HASH_SALT y hace que el
 * hash no se pueda revertir con una tabla precalculada del espacio IPv4, que
 * es chico y se recorre entero en minutos si no hay salt.
 *
 * Devuelve null si no hay IP: es preferible una columna vacía a un hash que
 * represente "desconocido" y agrupe escaneos que no tienen nada que ver.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const normalized = ip.trim().toLowerCase();
  if (normalized === "") return null;

  return createHash("sha256").update(`${env.ipHashSalt}${normalized}`).digest("hex");
}
