import type { ResolvedBracelet } from "@/db/queries/landing";
import { env } from "./env";

/**
 * Caché en memoria de la resolución código → local.
 *
 * Del otro lado hay una persona parada con el celular. Guardar en memoria la
 * relación código → datos del local evita ir a MySQL en cada escaneo, porque
 * esos datos cambian poquísimas veces por día.
 *
 * TTL corto para que un cambio hecho desde un panel se vea enseguida. Además,
 * al editar desde el panel se invalida la entrada a mano, así que en la
 * práctica el cambio es inmediato y el TTL es solo la red de contención.
 *
 * El caché vive en el proceso. Con varias instancias, cada una tiene la suya y
 * la invalidación manual solo alcanza a la que atendió el request del panel;
 * las demás se ponen al día cuando vence el TTL.
 */

type CacheEntry = {
  /** `null` cachea "este código no existe", para no repetir la consulta ante
   *  escaneos de códigos desconocidos o alguien probando al voleo. */
  value: ResolvedBracelet | null;
  expiresAt: number;
};

const globalForCache = globalThis as unknown as {
  __toqiaLandingCache?: Map<string, CacheEntry>;
};

const cache: Map<string, CacheEntry> =
  globalForCache.__toqiaLandingCache ?? new Map();

if (!env.isProduction) {
  globalForCache.__toqiaLandingCache = cache;
}

/**
 * `undefined` = no sé, hay que consultar la base.
 * `null` = ya consulté y ese código no existe.
 */
export function getCached(code: string): ResolvedBracelet | null | undefined {
  const entry = cache.get(code);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(code);
    return undefined;
  }

  return entry.value;
}

export function setCached(code: string, value: ResolvedBracelet | null): void {
  cache.set(code, { value, expiresAt: Date.now() + env.redirectCacheTtlMs });

  // Barrido perezoso para que el Map no crezca sin límite si alguien
  // bombardea con códigos inexistentes.
  if (cache.size > 5_000) pruneExpired();
}

/** Se llama al editar o desactivar una pulsera. */
export function invalidateBracelet(code: string): void {
  cache.delete(code);
}

/**
 * Se llama al editar un local, una cuenta o un camarero: cualquiera de esos
 * cambios afecta a todas las pulseras que cuelgan de ahí, y no vale la pena
 * mantener un índice inverso para invalidar solo las que corresponden.
 */
export function invalidateAll(): void {
  cache.clear();
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

export function cacheStats() {
  return { size: cache.size, ttlMs: env.redirectCacheTtlMs };
}
