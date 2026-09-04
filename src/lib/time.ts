/**
 * Manejo de fechas y períodos.
 *
 * Todo se guarda en UTC. Pero un restaurante piensa en días locales: "los
 * escaneos de hoy" son los de hoy en Argentina, no los del día UTC, que
 * arranca a las 21:00 del día anterior — justo en medio del servicio de cena.
 *
 * Argentina no tiene horario de verano, así que un desfase fijo alcanza y es
 * mucho más simple que depender de las tablas de zonas horarias de MySQL, que
 * no siempre están cargadas.
 */

function readOffsetHours(): number {
  const raw = process.env.APP_UTC_OFFSET_HOURS;
  if (!raw) return -3; // Argentina

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < -14 || parsed > 14) {
    console.warn(
      `[time] APP_UTC_OFFSET_HOURS="${raw}" no es válido; se usa -3 (Argentina).`
    );
    return -3;
  }
  return parsed;
}

/** Desfase de la zona local respecto de UTC, en horas. */
export const OFFSET_HOURS = readOffsetHours();

const HOUR_MS = 60 * 60 * 1000;

/**
 * Expresión SQL que devuelve la fecha local de un `datetime` guardado en UTC.
 * El valor sale de una variable de entorno validada como entero, no de
 * entrada del usuario.
 */
export function sqlLocalDate(column: string): string {
  const signo = OFFSET_HOURS >= 0 ? "+" : "-";
  return `DATE(DATE_ADD(${column}, INTERVAL ${signo}${Math.abs(OFFSET_HOURS)} HOUR))`;
}

/** Comienzo del día local de `ref`, expresado como instante UTC. */
export function startOfLocalDay(ref: Date = new Date()): Date {
  const local = new Date(ref.getTime() + OFFSET_HOURS * HOUR_MS);
  const inicioLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    0,
    0,
    0,
    0
  );
  return new Date(inicioLocal - OFFSET_HOURS * HOUR_MS);
}

/** Suma (o resta) días manteniendo el instante. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * HOUR_MS);
}

/** "YYYY-MM-DD" del día local al que pertenece el instante. */
export function localDateKey(date: Date): string {
  return new Date(date.getTime() + OFFSET_HOURS * HOUR_MS)
    .toISOString()
    .slice(0, 10);
}

export type Period = {
  /** Inclusive. */
  from: Date;
  /** Exclusive: simplifica los rangos y evita el problema de los milisegundos. */
  to: Date;
  /** Mismo largo, inmediatamente anterior. Sirve para "vs. período anterior". */
  prevFrom: Date;
  prevTo: Date;
  /** Cuántos días cubre. */
  days: number;
  /**
   * Cómo se llama el período, como **clave** dentro del espacio `Stats`.
   *
   * No es la frase ya escrita: este archivo no sabe en qué idioma está mirando
   * la pantalla quien pidió los datos, y un "Últimos 30 días" armado acá
   * llegaba en castellano al encabezado de un panel en alemán.
   */
  labelKey: string;
  /**
   * Para el rango a medida: los dos días en formato "YYYY-MM-DD". Se formatean
   * al renderizar, con el idioma del pedido, porque 04/09 y 04.09 no son la
   * misma fecha para todo el mundo.
   */
  labelDates?: { desde: string; hasta: string };
};

export const PERIOD_PRESETS = {
  "7d": { days: 7, labelKey: "label7d" },
  "30d": { days: 30, labelKey: "label30d" },
  "90d": { days: 90, labelKey: "label90d" },
  "365d": { days: 365, labelKey: "label365d" },
} as const;

export type PeriodKey = keyof typeof PERIOD_PRESETS;

export function isPeriodKey(value: string | undefined): value is PeriodKey {
  return value !== undefined && value in PERIOD_PRESETS;
}

/**
 * Arma el período a partir de un preset. Incluye el día de hoy completo:
 * `to` es el comienzo de mañana, así los escaneos de esta misma tarde entran.
 */
export function buildPeriod(key: PeriodKey): Period {
  const { days, labelKey } = PERIOD_PRESETS[key];

  const to = addDays(startOfLocalDay(), 1);
  const from = addDays(to, -days);

  return {
    from,
    to,
    prevFrom: addDays(from, -days),
    prevTo: from,
    days,
    labelKey,
  };
}

/**
 * Variación porcentual entre dos valores.
 * Devuelve null cuando el período anterior fue cero: no existe el "aumentó un
 * infinito por ciento", y mostrar un número inventado ahí es peor que no
 * mostrar nada.
 */
export function variation(actual: number, previo: number): number | null {
  if (previo === 0) return null;
  return ((actual - previo) / previo) * 100;
}

/**
 * Período a medida, a partir de dos días locales "YYYY-MM-DD".
 *
 * `hasta` es inclusivo para el usuario: si elige el 20, quiere ver todo el 20.
 * Internamente `to` queda en el comienzo del 21, que simplifica las
 * comparaciones y evita el problema de los milisegundos del final del día.
 *
 * El período anterior con el que se compara es uno del mismo largo,
 * inmediatamente previo.
 */
export function buildCustomPeriod(desde: string, hasta: string): Period | null {
  const from = parseLocalDay(desde);
  const toInclusive = parseLocalDay(hasta);
  if (!from || !toInclusive) return null;

  const to = addDays(toInclusive, 1);
  if (to <= from) return null;

  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * HOUR_MS)));

  return {
    from,
    to,
    prevFrom: addDays(from, -days),
    prevTo: from,
    days,
    labelKey: desde === hasta ? "elDia" : "delAl",
    labelDates: { desde, hasta },
  };
}

/** Convierte "YYYY-MM-DD" (día local) al instante UTC en que arranca ese día. */
function parseLocalDay(valor: string): Date | null {
  const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, anio, mes, dia] = match;
  const inicioLocal = Date.UTC(Number(anio), Number(mes) - 1, Number(dia), 0, 0, 0, 0);
  const fecha = new Date(inicioLocal - OFFSET_HOURS * HOUR_MS);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** El día local de hoy en formato "YYYY-MM-DD". Sirve para los inputs date. */
export function todayLocalKey(): string {
  return localDateKey(new Date());
}
