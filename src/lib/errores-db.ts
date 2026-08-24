/**
 * Traduce un error de MySQL a algo que el usuario pueda accionar.
 *
 * Existe porque el mensaje genérico —"No se pudo guardar. Probá de nuevo."— es
 * el peor final posible: el usuario prueba de nuevo, vuelve a fallar, y ni él
 * ni nosotros sabemos por qué. Y la causa más frecuente no se arregla probando
 * de nuevo: es una base a la que le faltan las migraciones, donde el código
 * pide una columna que ahí todavía no existe.
 *
 * Los errores conocidos se traducen a una instrucción concreta. Los demás se
 * muestran igual, con el texto crudo de MySQL: es jerga técnica, sí, pero es
 * la diferencia entre poder arreglarlo —o mandarlo por mensaje— y quedarse
 * apretando "Probá de nuevo" para siempre. Solo lo ve alguien con sesión
 * iniciada en un panel, no un cliente del restaurante.
 */

/** Números de error de MySQL que apuntan a un esquema desactualizado. */
const COLUMNA_DESCONOCIDA = 1054; // ER_BAD_FIELD_ERROR
const TABLA_INEXISTENTE = 1146; // ER_NO_SUCH_TABLE
const VALOR_TRUNCADO = 1265; // WARN_DATA_TRUNCATED (valor fuera de un enum)
const VALOR_DEMASIADO_LARGO = 1406; // ER_DATA_TOO_LONG
const CARACTER_NO_SOPORTADO = 1366; // ER_TRUNCATED_WRONG_VALUE_FOR_FIELD

type ErrorMysql = {
  errno?: number;
  sqlMessage?: string;
  cause?: unknown;
};

/**
 * Recorre la cadena de causas. Drizzle envuelve el error de mysql2, así que el
 * `errno` casi nunca está en el primer nivel.
 */
function buscarErrorMysql(cause: unknown, profundidad = 0): ErrorMysql | null {
  if (!cause || typeof cause !== "object" || profundidad > 4) return null;

  const error = cause as ErrorMysql;
  if (typeof error.errno === "number") return error;

  return buscarErrorMysql(error.cause, profundidad + 1);
}

const AVISO_MIGRACIONES =
  "Falta aplicar migraciones en la base: entrá al panel de administración, " +
  "sección Mantenimiento, y aplicá los cambios pendientes.";

/**
 * Una frase para agregarle al mensaje de error, o null si el error no dice
 * nada aprovechable.
 */
export function pistaDeErrorDeBase(cause: unknown): string | null {
  const error = buscarErrorMysql(cause);
  if (!error) return null;

  const detalle = error.sqlMessage ?? "";

  switch (error.errno) {
    case COLUMNA_DESCONOCIDA:
    case TABLA_INEXISTENTE:
      return `${AVISO_MIGRACIONES} (${detalle})`;

    case VALOR_TRUNCADO:
      // Un valor que no está en la lista permitida de una columna enum. Pasa
      // cuando la columna se creó antes de que existiera ese valor.
      return `${AVISO_MIGRACIONES} (${detalle})`;

    case VALOR_DEMASIADO_LARGO:
      return `Hay un campo con más texto del que entra. (${detalle})`;

    case CARACTER_NO_SOPORTADO:
      return (
        "La base no acepta alguno de los caracteres escritos: la tabla no está " +
        `en utf8mb4. (${detalle})`
      );

    default:
      // Cualquier otro error de MySQL igual se muestra. Es texto técnico, sí,
      // pero es la diferencia entre poder arreglarlo y quedarse apretando
      // "Probá de nuevo" para siempre.
      return detalle ? `Error de la base: ${detalle}` : null;
  }
}

/**
 * Arma el mensaje final: el de siempre, más la pista si la hay.
 *
 * @param base cómo empieza el mensaje, sin punto final (ej. "No se pudo guardar")
 */
export function mensajeDeError(base: string, cause: unknown): string {
  const pista = pistaDeErrorDeBase(cause);
  if (pista) return `${base}. ${pista}`;

  // No fue un error de MySQL. Igual se muestra lo que dijo, recortado: un
  // "Probá de nuevo" a secas deja al usuario probando de nuevo para siempre y
  // a nosotros sin nada que investigar.
  const detalle = cause instanceof Error ? cause.message.trim() : "";
  if (detalle) {
    const recortado =
      detalle.length > 220 ? `${detalle.slice(0, 220)}…` : detalle;
    return `${base}. ${recortado}`;
  }

  return `${base}. Probá de nuevo.`;
}
