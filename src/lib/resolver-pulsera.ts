import {
  resolveBraceletByCode,
  type ResolvedBracelet,
} from "@/db/queries/landing";
import { getBraceletByCode } from "@/db/queries/bracelets";
import { getCached, setCached } from "./redirect-cache";

/**
 * Resolución de un código de pulsera, compartida por la landing y la carta.
 *
 * Lo importante de este módulo es que **distingue "no existe" de "no se
 * pudo"**. Antes las dos páginas atrapaban el error de la base y devolvían
 * null, y null aguas abajo significaba "código desconocido": si la base fallaba
 * —por ejemplo, porque le faltaba una migración— cada cliente que apoyaba el
 * celular leía *"Pulsera no reconocida: puede que haya sido dada de baja o que
 * el código esté mal grabado"*.
 *
 * Es la peor mentira posible en esta pantalla. El restaurante cree que sus
 * pulseras se borraron y sale a revisar los chips uno por uno, cuando lo único
 * que pasaba era que el servidor no podía consultar la base.
 */

export type Resolucion =
  /** El código existe y apunta a un local. */
  | { estado: "ok"; datos: ResolvedBracelet }
  /** El código no está en la base, o está pero todavía sin local. */
  | { estado: "no-existe" }
  /** La base no respondió. No sabemos si el código existe o no. */
  | { estado: "falla" };

/**
 * Resuelve el código usando el caché en memoria.
 *
 * Un fallo no se cachea: la próxima visita vuelve a intentar. Cachear un error
 * transitorio lo convertiría en permanente durante todo el TTL.
 */
export async function resolverPulsera(
  code: string,
  origen: "landing" | "carta"
): Promise<Resolucion> {
  const cached = getCached(code);
  if (cached !== undefined) {
    return cached === null ? { estado: "no-existe" } : { estado: "ok", datos: cached };
  }

  try {
    const resuelto = await resolveBraceletByCode(code);
    setCached(code, resuelto);
    return resuelto === null
      ? { estado: "no-existe" }
      : { estado: "ok", datos: resuelto };
  } catch (error) {
    console.error(`[${origen}] falló la resolución de la pulsera`, {
      code,
      error: error instanceof Error ? error.message : String(error),
    });
    return { estado: "falla" };
  }
}

/**
 * A dónde mandar a alguien cuyo código no resolvió.
 *
 * Tres carteles distintos, porque son tres situaciones distintas y lo que el
 * cliente puede hacer al respecto también:
 *
 *  - **La base falló** → no es su teléfono ni el chip; que reintente.
 *  - **El código existe pero está en stock** → la pulsera está bien grabada,
 *    todavía no la asignaron a ningún local.
 *  - **El código no existe** → el chip está mal grabado o se dio de baja.
 */
export async function destinoDeCodigoNoResuelto(
  code: string,
  estado: "no-existe" | "falla"
): Promise<string> {
  const sufijo = `?c=${encodeURIComponent(code)}`;

  if (estado === "falla") return `/pulsera/error${sufijo}`;

  try {
    const pulsera = await getBraceletByCode(code);
    if (pulsera && pulsera.locationId === null) {
      return `/pulsera/sin-asignar${sufijo}`;
    }
  } catch (cause) {
    // Si la base también falla en esta segunda consulta, el cartel correcto ya
    // no es "no reconocida" sino el de falla: acabamos de comprobar que la base
    // no está respondiendo.
    console.error("[pulsera] no se pudo distinguir el motivo", { code, cause });
    return `/pulsera/error${sufijo}`;
  }

  return `/pulsera/no-reconocida${sufijo}`;
}

/**
 * Toleramos que el código llegue con espacios o url-encodeado, pero se compara
 * tal cual está en la base.
 */
export function normalizeCode(raw: string | undefined): string | null {
  if (!raw) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Un % suelto rompe decodeURIComponent; seguimos con el valor original.
  }

  const trimmed = decoded.trim();
  if (trimmed === "" || trimmed.length > 50) return null;
  return trimmed;
}
