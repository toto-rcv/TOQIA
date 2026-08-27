/**
 * Freno de intentos de ingreso.
 *
 * Después de 7 contraseñas mal, el mismo cliente no puede volver a probar
 * durante un minuto. Sin esto, `/api/auth/sign-in/email` acepta todos los
 * pedidos que le manden: un script prueba miles de contraseñas por minuto
 * contra una cuenta y nadie se entera.
 *
 * **La clave es IP + email, no una sola de las dos.** Contar solo por IP
 * dejaría afuera a todo un restaurante que sale por el mismo router cuando un
 * empleado se equivoca siete veces. Contar solo por email deja que cualquiera
 * bloquee la cuenta ajena a propósito, que es un ataque en sí mismo. La
 * combinación frena lo que hay que frenar —alguien insistiendo contra una
 * cuenta desde una máquina— sin ninguno de los dos efectos.
 *
 * El contador vive en memoria del proceso. Eso implica dos cosas que conviene
 * tener presentes: se pierde en cada despliegue (el peor caso es que un
 * atacante recupere sus siete intentos justo cuando sale una versión nueva), y
 * si algún día hay más de una instancia, cada una lleva su propia cuenta. Para
 * el volumen de Toqia alcanza y no agrega una dependencia externa.
 */

/** Cuántas contraseñas mal se toleran antes de frenar. */
export const MAX_INTENTOS = 7;

/** Cuánto dura el bloqueo. */
export const BLOQUEO_MS = 60_000;

/**
 * Cuánto se recuerda un fallo suelto.
 *
 * Sin esto, seis errores repartidos a lo largo de un mes bloquearían a alguien
 * que simplemente tiene mala memoria. La ventana hace que el contador se
 * refiera a "intentos seguidos" y no a "intentos de toda la vida".
 */
const VENTANA_MS = 15 * 60_000;

type Registro = {
  fallos: number;
  /** Cuándo fue el último fallo, para vencer la ventana. */
  ultimo: number;
  /** Si está bloqueado, hasta cuándo. */
  bloqueadoHasta: number;
};

const registros = new Map<string, Registro>();

/** Tope de claves, para que un ataque con emails al azar no coma la memoria. */
const MAX_CLAVES = 10_000;

export function claveDeIntento(ip: string | null, email: string): string {
  return `${ip ?? "sin-ip"}|${email.trim().toLowerCase()}`;
}

export type EstadoDeIntentos = {
  bloqueado: boolean;
  /** Segundos que faltan para poder volver a probar. 0 si no está bloqueado. */
  segundosRestantes: number;
  /** Intentos que quedan antes del bloqueo. */
  intentosRestantes: number;
};

export function estadoDeIntentos(clave: string): EstadoDeIntentos {
  const ahora = Date.now();
  const registro = registros.get(clave);

  if (!registro) {
    return { bloqueado: false, segundosRestantes: 0, intentosRestantes: MAX_INTENTOS };
  }

  if (registro.bloqueadoHasta > ahora) {
    return {
      bloqueado: true,
      // Se redondea para arriba: decir "0 segundos" cuando todavía faltan 400
      // milisegundos hace que el siguiente intento vuelva a fallar.
      segundosRestantes: Math.ceil((registro.bloqueadoHasta - ahora) / 1000),
      intentosRestantes: 0,
    };
  }

  // Venció el bloqueo, o pasó tanto tiempo desde el último fallo que ya no
  // cuenta: se arranca de cero.
  if (registro.bloqueadoHasta !== 0 || ahora - registro.ultimo > VENTANA_MS) {
    registros.delete(clave);
    return { bloqueado: false, segundosRestantes: 0, intentosRestantes: MAX_INTENTOS };
  }

  return {
    bloqueado: false,
    segundosRestantes: 0,
    intentosRestantes: Math.max(0, MAX_INTENTOS - registro.fallos),
  };
}

/** Suma un fallo y devuelve cómo queda el cliente después de sumarlo. */
export function registrarFallo(clave: string): EstadoDeIntentos {
  const ahora = Date.now();
  limpiarVencidos(ahora);

  const previo = registros.get(clave);
  const dentroDeLaVentana = previo && ahora - previo.ultimo <= VENTANA_MS;
  const fallos = (dentroDeLaVentana ? previo.fallos : 0) + 1;

  const registro: Registro = {
    fallos,
    ultimo: ahora,
    bloqueadoHasta: fallos >= MAX_INTENTOS ? ahora + BLOQUEO_MS : 0,
  };

  registros.set(clave, registro);

  if (registro.bloqueadoHasta > 0) {
    return {
      bloqueado: true,
      segundosRestantes: Math.ceil(BLOQUEO_MS / 1000),
      intentosRestantes: 0,
    };
  }

  return {
    bloqueado: false,
    segundosRestantes: 0,
    intentosRestantes: MAX_INTENTOS - fallos,
  };
}

/** Un ingreso correcto borra el historial: el que entró no es el que atacaba. */
export function limpiarIntentos(clave: string): void {
  registros.delete(clave);
}

/**
 * Saca de la memoria lo que ya no sirve.
 *
 * Corre en cada fallo y no con un `setInterval`: un temporizador quedaría vivo
 * para siempre y mantendría el proceso despierto sin necesidad.
 */
function limpiarVencidos(ahora: number): void {
  if (registros.size < MAX_CLAVES) {
    // Barrido barato: solo cuando hay algo para barrer.
    if (registros.size < 128) return;
  }

  for (const [clave, registro] of registros) {
    const vencido =
      registro.bloqueadoHasta < ahora && ahora - registro.ultimo > VENTANA_MS;
    if (vencido) registros.delete(clave);
  }

  // Si aún así sigue lleno, es un ataque con emails distintos: se vacía todo.
  // Perder los contadores es preferible a quedarse sin memoria.
  if (registros.size >= MAX_CLAVES) registros.clear();
}

/** Solo para las pruebas: deja el contador como recién arrancado. */
export function reiniciarIntentos(): void {
  registros.clear();
}
