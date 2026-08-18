import { env } from "./env";

/**
 * Caché en memoria del endpoint /r/[code].
 *
 * Por qué existe: del otro lado hay una persona parada con el celular en la
 * mano. Ir a MySQL en cada escaneo agrega una ida y vuelta que se puede
 * evitar, porque la relación código → destino cambia poquísimas veces por día.
 *
 * Por qué tiene TTL corto: el requisito es poder cambiar el destino desde el
 * panel sin tocar las pulseras. Con TTL de 60 segundos, un cambio se ve como
 * mucho un minuto después. Además, al editar desde el panel invalidamos la
 * entrada a mano (ver `invalidateBracelet`), así que en la práctica el cambio
 * es inmediato.
 *
 * Nota para producción: el caché vive en el proceso. Si PM2 corre en modo
 * cluster con varias instancias, cada una tiene el suyo y la invalidación
 * manual solo alcanza a la instancia que atendió el request del panel; las
 * demás se ponen al día cuando vence el TTL. Por eso ecosystem.config.js
 * arranca con `instances: 1`.
 */

export type CachedBracelet = {
  braceletId: number;
  restaurantId: number;
  destinationUrl: string;
  braceletActive: boolean;
  restaurantActive: boolean;
};

/** `null` cachea explícitamente "este código no existe", para no volver a
 *  consultar la base ante un escaneo repetido de una pulsera desconocida
 *  (o ante alguien probando códigos al voleo). */
type CacheEntry = {
  value: CachedBracelet | null;
  expiresAt: number;
};

const globalForCache = globalThis as unknown as {
  __pulserasRedirectCache?: Map<string, CacheEntry>;
};

// Igual que el pool: sobrevive a las recargas de módulos en desarrollo.
const cache: Map<string, CacheEntry> =
  globalForCache.__pulserasRedirectCache ?? new Map();

if (!env.isProduction) {
  globalForCache.__pulserasRedirectCache = cache;
}

/**
 * Devuelve la entrada cacheada, o `undefined` si no hay o si venció.
 * Ojo con la diferencia: `undefined` = no sé, hay que consultar la base.
 * `null` (dentro de la entrada) = ya consulté y ese código no existe.
 */
export function getCached(code: string): CachedBracelet | null | undefined {
  const entry = cache.get(code);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(code);
    return undefined;
  }

  return entry.value;
}

export function setCached(code: string, value: CachedBracelet | null): void {
  cache.set(code, { value, expiresAt: Date.now() + env.redirectCacheTtlMs });

  // Barrido perezoso: cada tanto limpiamos vencidos para que el Map no crezca
  // indefinidamente si alguien bombardea con códigos inexistentes.
  if (cache.size > 5_000) {
    pruneExpired();
  }
}

/** Se llama desde el panel al editar/desactivar una pulsera. */
export function invalidateBracelet(code: string): void {
  cache.delete(code);
}

/** Se llama al desactivar un restaurante: afecta a todas sus pulseras. */
export function invalidateAll(): void {
  cache.clear();
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

/** Solo para diagnóstico. */
export function cacheStats() {
  return { size: cache.size, ttlMs: env.redirectCacheTtlMs };
}
