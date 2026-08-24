import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db, mediaFiles, type MediaKind } from "@/db";

/**
 * Subida y borrado de archivos (logos, portadas, fotos de platos, cartas PDF).
 *
 * Regla de oro: **un archivo por campo**. Cuando el local sube una imagen
 * nueva, la anterior se borra en la misma operación. Sin eso, cada cambio de
 * foto dejaría la vieja ocupando lugar en la base para siempre.
 *
 * El tipo de archivo se verifica por los primeros bytes, no por el
 * `Content-Type` que manda el navegador: ese lo elige el cliente y se puede
 * falsificar. Un .exe renombrado a .jpg no pasa.
 */

/* ── Tipos permitidos ────────────────────────────────────────────────────── */

const IMAGENES: Record<string, { ext: string; firma: (b: Buffer) => boolean }> = {
  "image/jpeg": {
    ext: "jpg",
    firma: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/png": {
    ext: "png",
    firma: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  "image/gif": {
    ext: "gif",
    firma: (b) => b.subarray(0, 3).toString("latin1") === "GIF",
  },
  "image/webp": {
    ext: "webp",
    firma: (b) =>
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
  "image/avif": {
    // Caja ftyp con marca avif/avis dentro de los primeros 32 bytes.
    ext: "avif",
    firma: (b) =>
      b.subarray(4, 8).toString("latin1") === "ftyp" &&
      /avi[fs]/.test(b.subarray(8, 24).toString("latin1")),
  },
};

const PDF = {
  ext: "pdf",
  firma: (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-",
};

/** Límites en bytes. Una foto de plato de 6 MB no aporta nada en un celular. */
export const LIMITE_IMAGEN = 6 * 1024 * 1024;
export const LIMITE_PDF = 12 * 1024 * 1024;

export const ACEPTA_IMAGEN = Object.keys(IMAGENES).join(",");
export const ACEPTA_PDF = "application/pdf";

/* ── Errores ─────────────────────────────────────────────────────────────── */

/** Error con un mensaje ya listo para mostrarle al usuario del panel. */
export class ErrorDeArchivo extends Error {}

function mb(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/* ── Subida ──────────────────────────────────────────────────────────────── */

type Formato = "imagen" | "pdf";

/**
 * Guarda el archivo y devuelve la URL interna con la que se lo referencia.
 * Lanza `ErrorDeArchivo` con un mensaje en castellano si algo no cierra.
 */
export async function guardarArchivo({
  file,
  locationId,
  kind,
  formato,
  etiqueta,
}: {
  file: File;
  locationId: number;
  kind: MediaKind;
  formato: Formato;
  /** Cómo se llama el campo en el formulario, para los mensajes de error. */
  etiqueta: string;
}): Promise<string> {
  const limite = formato === "pdf" ? LIMITE_PDF : LIMITE_IMAGEN;

  if (file.size === 0) {
    throw new ErrorDeArchivo(`${etiqueta}: el archivo está vacío.`);
  }
  if (file.size > limite) {
    throw new ErrorDeArchivo(
      `${etiqueta}: el archivo pesa ${mb(file.size)} y el máximo es ${mb(limite)}.`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // El navegador puede mandar cualquier cosa en `file.type`; el que manda es
  // el contenido real del archivo.
  let mimeType: string;
  let extension: string;

  if (formato === "pdf") {
    if (!PDF.firma(buffer)) {
      throw new ErrorDeArchivo(`${etiqueta}: el archivo no es un PDF válido.`);
    }
    mimeType = "application/pdf";
    extension = PDF.ext;
  } else {
    const detectado = Object.entries(IMAGENES).find(([, spec]) =>
      spec.firma(buffer)
    );
    if (!detectado) {
      throw new ErrorDeArchivo(
        `${etiqueta}: el archivo no es una imagen válida (se aceptan JPG, PNG, WebP, GIF y AVIF).`
      );
    }
    [mimeType] = detectado;
    extension = detectado[1].ext;
  }

  const checksum = createHash("sha256").update(buffer).digest("hex");

  try {
    const [resultado] = await db.insert(mediaFiles).values({
      locationId,
      kind,
      filename: nombreLimpio(file.name, extension),
      mimeType,
      sizeBytes: buffer.byteLength,
      checksum,
      data: buffer,
    });

    return urlDe(resultado.insertId, checksum, extension);
  } catch (cause) {
    console.error("[media] no se pudo guardar el archivo", {
      locationId,
      kind,
      size: buffer.byteLength,
      cause,
    });

    // MySQL rechaza un valor que no está en el enum de `kind` con este error.
    // Pasa cuando la tabla se creó con una versión vieja del esquema y todavía
    // no conoce el tipo de archivo (por ejemplo "dish", la foto de un plato).
    // No es culpa del archivo, y decirle al usuario que pruebe con uno más
    // liviano lo manda a perseguir un problema que no existe.
    if (esValorFueraDelEnum(cause)) {
      throw new ErrorDeArchivo(
        `${etiqueta}: la base todavía no acepta este tipo de archivo. ` +
          "Hay que aplicar las migraciones pendientes desde Mantenimiento, en el panel de administración."
      );
    }

    throw new ErrorDeArchivo(
      `${etiqueta}: no se pudo guardar el archivo. Probá con uno más liviano.`
    );
  }
}

/** ¿El error es "Data truncated for column …", que MySQL usa para los enums? */
function esValorFueraDelEnum(cause: unknown): boolean {
  // El error de drizzle envuelve el de mysql2 en `cause`, así que hay que
  // mirar los dos niveles.
  const candidatos = [cause, (cause as { cause?: unknown })?.cause];

  return candidatos.some((error) => {
    const codigo = (error as { errno?: number })?.errno;
    return codigo === 1265 || codigo === 1406;
  });
}

/**
 * Resuelve el valor final de un campo de imagen/PDF a partir del formulario.
 *
 * Tres casos, en este orden:
 *   1. Subieron un archivo nuevo → se guarda y se borra el anterior.
 *   2. Marcaron "quitar"        → se borra el anterior y queda vacío.
 *   3. No tocaron nada          → se conserva lo que había.
 */
export async function resolverCampoDeArchivo({
  file,
  quitar,
  actual,
  locationId,
  kind,
  formato,
  etiqueta,
}: {
  file: FormDataEntryValue | null;
  quitar: boolean;
  actual: string | null;
  locationId: number;
  kind: MediaKind;
  formato: Formato;
  etiqueta: string;
}): Promise<string | null> {
  const subido = esArchivoConContenido(file) ? file : null;

  if (subido) {
    const nueva = await guardarArchivo({
      file: subido,
      locationId,
      kind,
      formato,
      etiqueta,
    });
    // Recién acá se borra la anterior: si la subida falla, el local se queda
    // con la foto que tenía en vez de quedarse sin ninguna.
    await borrarArchivoDeUrl(actual, locationId);
    return nueva;
  }

  if (quitar) {
    await borrarArchivoDeUrl(actual, locationId);
    return null;
  }

  return actual;
}

/** Un input file vacío llega igual, como un File de 0 bytes y sin nombre. */
export function esArchivoConContenido(
  value: FormDataEntryValue | null
): value is File {
  return value instanceof File && value.size > 0;
}

/* ── Borrado ─────────────────────────────────────────────────────────────── */

const PATRON_URL = /^\/api\/media\/(\d+)\//;

/** ¿Esta URL apunta a un archivo nuestro (y no a un enlace externo)? */
export function esArchivoPropio(url: string | null | undefined): boolean {
  return typeof url === "string" && PATRON_URL.test(url.trim());
}

/**
 * Borra el archivo al que apunta la URL, si es nuestro y es de este local.
 *
 * Lo de "de este local" no es paranoia gratuita: la URL sale de una columna de
 * la base, y sin el filtro un valor mal cargado podría borrar el archivo de
 * otro restaurante.
 */
export async function borrarArchivoDeUrl(
  url: string | null | undefined,
  locationId: number
): Promise<void> {
  if (typeof url !== "string") return;
  const match = PATRON_URL.exec(url.trim());
  if (!match) return;

  const id = Number.parseInt(match[1], 10);
  if (!Number.isFinite(id)) return;

  try {
    await db
      .delete(mediaFiles)
      .where(and(eq(mediaFiles.id, id), eq(mediaFiles.locationId, locationId)));
  } catch (cause) {
    // Que no se pueda borrar el viejo no es motivo para fallar el guardado:
    // queda un archivo de más, no un dato perdido.
    console.error("[media] no se pudo borrar el archivo anterior", { id, cause });
  }
}

/* ── Auxiliares ──────────────────────────────────────────────────────────── */

function urlDe(id: number, checksum: string, extension: string): string {
  // Los 16 primeros caracteres del hash alcanzan de sobra para distinguir
  // versiones del mismo campo y dejan la URL legible.
  return `/api/media/${id}/${checksum.slice(0, 16)}.${extension}`;
}

/** Nombre original saneado; se usa solo al descargar el PDF de la carta. */
function nombreLimpio(original: string, extension: string): string {
  const base = (original || "archivo")
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .trim()
    .slice(0, 80);

  return `${base === "" ? "archivo" : base}.${extension}`;
}
