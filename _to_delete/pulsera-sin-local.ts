import { getBraceletByCode } from "@/db/queries/bracelets";

/**
 * A dónde mandar a alguien que escaneó un código que no resolvió a ningún
 * local.
 *
 * Son dos situaciones distintas y el cliente merece saber cuál:
 *
 *  - El código no existe → el chip está mal grabado o la pulsera se dio de
 *    baja.
 *  - El código existe pero la pulsera todavía está en un stock, sin local →
 *    está bien grabada, simplemente no la pusieron a trabajar todavía.
 *
 * La consulta extra solo corre en el camino de error, que es raro: el camino
 * feliz se resuelve antes con el caché en memoria y nunca llega acá.
 */
export async function destinoDeCodigoSinLocal(code: string): Promise<string> {
  const sufijo = `?c=${encodeURIComponent(code)}`;

  try {
    const pulsera = await getBraceletByCode(code);
    if (pulsera && pulsera.locationId === null) {
      return `/pulsera/sin-asignar${sufijo}`;
    }
  } catch (cause) {
    // Si la base falla justo acá, el mensaje genérico sigue siendo correcto:
    // no vale la pena romper la página por afinar el texto del cartel.
    console.error("[pulsera] no se pudo distinguir el motivo", { code, cause });
  }

  return `/pulsera/no-reconocida${sufijo}`;
}
