import { eq } from "drizzle-orm";

import { db, mediaFiles } from "@/db";

/**
 * Sirve los archivos que subió el restaurante: logo, portada, fotos de platos
 * y la carta en PDF.
 *
 *   /api/media/12/9f3a1c...e4.jpg
 *              │  └── checksum del contenido + extensión
 *              └── id de la fila en media_files
 *
 * El token no es un secreto ni una autorización: es lo que hace que la URL
 * cambie cuando cambia el archivo. Gracias a eso la respuesta puede declararse
 * `immutable` y el navegador del cliente no vuelve a pedir la imagen nunca
 * más, que es exactamente lo que queremos en una página que se abre desde un
 * celular con datos móviles.
 *
 * No lleva sesión: son las imágenes de una página pública.
 */

export const runtime = "nodejs";
// Los bytes salen de la base; no hay nada que pre-renderizar.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  const { id: rawId, token } = await params;

  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return new Response("No encontrado", { status: 404 });
  }

  try {
    const filas = await db
      .select({
        mimeType: mediaFiles.mimeType,
        filename: mediaFiles.filename,
        checksum: mediaFiles.checksum,
        data: mediaFiles.data,
      })
      .from(mediaFiles)
      .where(eq(mediaFiles.id, id))
      .limit(1);

    const archivo = filas[0];
    if (!archivo) return new Response("No encontrado", { status: 404 });

    // Si el token no coincide, la URL quedó vieja: alguien la tiene guardada
    // de antes de que el local cambiara la foto. Devolver 404 evita servir
    // contenido distinto del que esa URL prometía cachear para siempre.
    const esperado = archivo.checksum.slice(0, 16);
    if (!token.startsWith(esperado)) {
      return new Response("No encontrado", { status: 404 });
    }

    const cuerpo = new Uint8Array(archivo.data);

    return new Response(cuerpo, {
      headers: {
        "Content-Type": archivo.mimeType,
        "Content-Length": String(cuerpo.byteLength),
        // El contenido de esta URL no puede cambiar: si cambia el archivo,
        // cambia el token y por lo tanto la URL.
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: `"${archivo.checksum}"`,
        // `inline` para que el PDF de la carta se abra en el visor del
        // celular en vez de descargarse.
        "Content-Disposition": `inline; filename="${archivo.filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[media] no se pudo leer el archivo", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("Error al leer el archivo", { status: 500 });
  }
}
