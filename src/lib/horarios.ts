import { normalizeMenuIcon } from "./menu-icons";

/**
 * Los horarios que el local muestra en su página.
 *
 * No hay un esquema de días y turnos a propósito. No existe una forma común:
 * un restaurante separa cocina de bar, una peluquería atiende corrido, un
 * taller cierra al mediodía y una tienda abre distinto los sábados. Cualquier
 * armador de días y turnos que cubriera todo eso sería más difícil de cargar
 * que escribirlo, y el que no lo cubriera dejaría afuera a medio padrón.
 *
 * Así que un bloque es un título ("Cocina", "Bar", "Atención al público"), un
 * ícono opcional y renglones de texto libre. La forma la elige el local.
 *
 * Este archivo no importa nada de Next: lo usan tanto la Server Action que
 * guarda como el componente cliente que edita.
 */

export type BloqueDeHorario = {
  /** Id del catálogo (`lib/menu-icons.ts`). Nulo = el bloque va sin ícono. */
  icon: string | null;
  title: string;
  /** Un renglón por línea. */
  text: string;
};

/** Más de seis bloques no es un horario, es una tabla. */
export const MAX_BLOQUES_HORARIO = 6;
export const MAX_TITULO_BLOQUE = 60;
export const MAX_TEXTO_BLOQUE = 600;

/**
 * Deja una lista de bloques utilizable, venga de donde venga.
 *
 * Se llama en los dos extremos: al guardar, sobre lo que mandó el formulario,
 * y al leer, sobre lo que devuelve la columna JSON. Lo segundo no es paranoia
 * de más: en esa columna puede haber quedado cualquier cosa de una versión
 * anterior del formato, y la página del cliente no se puede caer por eso.
 */
export function normalizarBloquesDeHorario(valor: unknown): BloqueDeHorario[] {
  // mysql2 devuelve la columna JSON ya parseada, pero según el driver y la
  // versión puede llegar como texto. Los dos casos valen.
  const crudo = typeof valor === "string" ? parsear(valor) : valor;
  if (!Array.isArray(crudo)) return [];

  const limpios: BloqueDeHorario[] = [];

  for (const item of crudo) {
    if (!item || typeof item !== "object") continue;
    const bloque = item as Record<string, unknown>;

    const title = texto(bloque.title).slice(0, MAX_TITULO_BLOQUE);
    const cuerpo = texto(bloque.text).slice(0, MAX_TEXTO_BLOQUE);

    // Un bloque sin nada escrito no se guarda: si no, agregar uno por error y
    // apretar guardar dejaría una tarjeta vacía en la página del cliente.
    if (title === "" && cuerpo === "") continue;

    limpios.push({
      icon: normalizeMenuIcon(typeof bloque.icon === "string" ? bloque.icon : null),
      title,
      text: cuerpo,
    });

    if (limpios.length === MAX_BLOQUES_HORARIO) break;
  }

  return limpios;
}

/** ¿Hay algo que mostrar? Decide si el botón de horarios existe. */
export function hayHorarios(bloques: BloqueDeHorario[]): boolean {
  return bloques.length > 0;
}

export type RenglonDeHorario = {
  izquierda: string;
  /** El horario, cuando el renglón venía partido en dos. */
  derecha: string | null;
};

/**
 * Parte cada renglón en día y horario.
 *
 * El corte es el primer tabulador o los primeros dos espacios seguidos, que es
 * como alinea cualquiera que escriba un horario a mano:
 *
 *     Lunes a jueves    13:00 – 16:00 | 19:00 – 23:00
 *
 * Un renglón sin ese corte se muestra entero y alineado a la izquierda, que es
 * lo correcto para un "Abierto todos los días" suelto. Nadie queda obligado a
 * aprenderse la convención para que le quede bien.
 */
export function renglonesDelBloque(texto: string): RenglonDeHorario[] {
  return texto
    .split("\n")
    .map((renglon) => renglon.trim())
    .filter((renglon) => renglon !== "")
    .map((renglon) => {
      const corte = renglon.search(/\t|\s{2,}/);
      if (corte === -1) return { izquierda: renglon, derecha: null };

      return {
        izquierda: renglon.slice(0, corte).trim(),
        derecha: renglon.slice(corte).trim() || null,
      };
    });
}

function texto(valor: unknown): string {
  if (typeof valor !== "string") return "";
  // \r\n de un Windows que pegó desde el Bloc de notas: si no, cada renglón
  // arrastra un retorno de carro y el corte de dos espacios nunca coincide.
  return valor.replace(/\r\n?/g, "\n").trim();
}

function parsear(valor: string): unknown {
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}
