import { randomUUID } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";

import { db, scans } from "@/db";

/** Ventana de deduplicación: recargas de la misma persona no suman escaneos. */
const DEDUPE_WINDOW_MS = 30_000;

type ScanInput = {
  braceletId: number;
  locationId: number;
  accountId: number;
  waiterId: number | null;
  userAgent: string | null;
  ipHash: string | null;
};

/**
 * Registra el escaneo y devuelve el token con el que la landing va a poder
 * reportar el clic al botón de reseña.
 *
 * Se ejecuta durante el render de la landing, no después: como ya estamos
 * armando una página, escribir acá elimina la carrera en la que el clic a
 * Google llegaba antes de que existiera el escaneo al que atribuirlo.
 *
 * Nunca lanza. Si la base falla, devuelve null y la landing se muestra igual;
 * perdemos el registro, que es mucho mejor que dejar a alguien mirando una
 * pantalla de error al lado de la caja.
 */
export async function recordScan(input: ScanInput): Promise<string | null> {
  try {
    // ── Deduplicación ──────────────────────────────────────────────────────
    // Una recarga de la página no puede contar como un escaneo nuevo. Si el
    // mismo dispositivo ya escaneó esta pulsera hace menos de 30 segundos,
    // devolvemos el token del escaneo anterior en vez de crear otro.
    //
    // Sin ipHash no podemos distinguir dispositivos, así que no deduplicamos:
    // es preferible contar de más que agrupar escaneos de personas distintas.
    if (input.ipHash) {
      const desde = new Date(Date.now() - DEDUPE_WINDOW_MS);
      const previos = await db
        .select({ token: scans.token })
        .from(scans)
        .where(
          and(
            eq(scans.braceletId, input.braceletId),
            eq(scans.ipHash, input.ipHash),
            gte(scans.scannedAt, desde)
          )
        )
        .orderBy(desc(scans.scannedAt))
        .limit(1);

      if (previos[0]) return previos[0].token;
    }

    const token = randomUUID();

    await db.insert(scans).values({
      token,
      braceletId: input.braceletId,
      locationId: input.locationId,
      accountId: input.accountId,
      // Se copia el camarero del momento del escaneo. Si mañana la pulsera
      // cambia de dueño, los escaneos viejos siguen atribuidos a quien la
      // tenía entonces, que es lo correcto para un ranking mensual.
      waiterId: input.waiterId,
      scannedAt: new Date(), // UTC
      // La columna es varchar(512): truncamos en vez de dejar que MySQL
      // rechace la fila entera por un user agent largo.
      userAgent: input.userAgent ? input.userAgent.slice(0, 512) : null,
      ipHash: input.ipHash,
    });

    return token;
  } catch (error) {
    console.error("[scan-logger] no se pudo registrar el escaneo", {
      braceletId: input.braceletId,
      locationId: input.locationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Marca que la persona tocó el botón de reseña.
 *
 * Idempotente: si el escaneo ya tenía la marca, no la pisa. Un doble clic o un
 * reintento del navegador no tiene que mover la hora del primer clic.
 */
export async function markReviewClick(token: string): Promise<boolean> {
  try {
    const filas = await db
      .select({ id: scans.id, reviewClickedAt: scans.reviewClickedAt })
      .from(scans)
      .where(eq(scans.token, token))
      .limit(1);

    const fila = filas[0];
    if (!fila) return false;
    if (fila.reviewClickedAt) return true;

    await db
      .update(scans)
      .set({ reviewClickedAt: new Date() })
      .where(eq(scans.id, fila.id));

    return true;
  } catch (error) {
    console.error("[scan-logger] no se pudo marcar el clic de reseña", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
