/** Prueba manual del subsistema de archivos. No forma parte de la app. */
import "dotenv/config";

import { eq } from "drizzle-orm";
import { db, locations, mediaFiles, pool } from "../src/db";
import {
  ErrorDeArchivo,
  borrarArchivoDeUrl,
  esArchivoPropio,
  guardarArchivo,
  resolverCampoDeArchivo,
} from "../src/lib/media";
import { reservationUrlFor, safeUrl } from "../src/lib/url";

function png(): Buffer {
  // PNG 1×1 transparente.
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
}

function pdf(): Buffer {
  return Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
}

function archivo(nombre: string, bytes: Buffer, tipo: string): File {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

async function main() {
  const [local] = await db.select().from(locations).limit(1);
  if (!local) throw new Error("No hay locales; corré el seed primero.");
  const locationId = local.id;

  let fallos = 0;
  const check = (nombre: string, ok: boolean, extra = "") => {
    console.log(`${ok ? "  ✓" : "  ✗"} ${nombre}${extra ? ` — ${extra}` : ""}`);
    if (!ok) fallos += 1;
  };

  console.log("\nSubida");
  const url1 = await guardarArchivo({
    file: archivo("Logo del Local ñ.png", png(), "image/png"),
    locationId,
    kind: "logo",
    formato: "imagen",
    etiqueta: "El logo",
  });
  check("guarda un PNG y devuelve /api/media/…", /^\/api\/media\/\d+\/[0-9a-f]{16}\.png$/.test(url1), url1);

  const id1 = Number(url1.split("/")[3]);
  const [fila1] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id1));
  check("guarda los bytes intactos", fila1.data.equals(png()));
  check("detecta el mime real", fila1.mimeType === "image/png", fila1.mimeType);
  check("sanea el nombre (saca tildes y raros)", fila1.filename === "Logo del Local n.png", fila1.filename);

  const urlPdf = await guardarArchivo({
    file: archivo("carta.pdf", pdf(), "application/pdf"),
    locationId,
    kind: "menu_pdf",
    formato: "pdf",
    etiqueta: "La carta",
  });
  check("guarda un PDF", urlPdf.endsWith(".pdf"), urlPdf);

  console.log("\nRechazos");
  try {
    await guardarArchivo({
      file: archivo("virus.jpg", Buffer.from("MZ\x90\x00 esto es un ejecutable"), "image/jpeg"),
      locationId,
      kind: "dish",
      formato: "imagen",
      etiqueta: "La foto",
    });
    check("rechaza un ejecutable disfrazado de jpg", false);
  } catch (error) {
    check(
      "rechaza un ejecutable disfrazado de jpg",
      error instanceof ErrorDeArchivo,
      error instanceof Error ? error.message : ""
    );
  }

  try {
    await guardarArchivo({
      file: archivo("grande.png", Buffer.alloc(7 * 1024 * 1024, 1), "image/png"),
      locationId,
      kind: "dish",
      formato: "imagen",
      etiqueta: "La foto",
    });
    check("rechaza una imagen de 7 MB", false);
  } catch (error) {
    check(
      "rechaza una imagen de 7 MB",
      error instanceof ErrorDeArchivo,
      error instanceof Error ? error.message : ""
    );
  }

  try {
    await guardarArchivo({
      file: archivo("noesunpdf.pdf", png(), "application/pdf"),
      locationId,
      kind: "menu_pdf",
      formato: "pdf",
      etiqueta: "La carta",
    });
    check("rechaza un PNG renombrado a .pdf", false);
  } catch (error) {
    check("rechaza un PNG renombrado a .pdf", error instanceof ErrorDeArchivo);
  }

  console.log("\nReemplazo");
  const url2 = await resolverCampoDeArchivo({
    file: archivo("nuevo.png", Buffer.concat([png(), Buffer.from("x")]), "image/png"),
    quitar: false,
    actual: url1,
    locationId,
    kind: "logo",
    formato: "imagen",
    etiqueta: "El logo",
  });
  const quedaViejo = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id1));
  check("la URL cambia al subir uno nuevo", url2 !== url1);
  check("el archivo anterior se borra", quedaViejo.length === 0);

  const url3 = await resolverCampoDeArchivo({
    file: null,
    quitar: false,
    actual: url2,
    locationId,
    kind: "logo",
    formato: "imagen",
    etiqueta: "El logo",
  });
  check("sin tocar nada, conserva lo que había", url3 === url2);

  const url4 = await resolverCampoDeArchivo({
    file: null,
    quitar: true,
    actual: url2,
    locationId,
    kind: "logo",
    formato: "imagen",
    etiqueta: "El logo",
  });
  const id2 = Number((url2 ?? "//0").split("/")[3]);
  const trasQuitar = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id2));
  check("quitar deja el campo vacío", url4 === null);
  check("quitar borra el archivo", trasQuitar.length === 0);

  console.log("\nAislamiento");
  const otro = await db.select().from(locations).limit(2);
  if (otro.length > 1) {
    const ajena = await guardarArchivo({
      file: archivo("ajena.png", png(), "image/png"),
      locationId: otro[1].id,
      kind: "dish",
      formato: "imagen",
      etiqueta: "La foto",
    });
    // Intento de borrar el archivo de otro local pasándolo como propio.
    await borrarArchivoDeUrl(ajena, locationId);
    const idAjena = Number(ajena.split("/")[3]);
    const sigue = await db.select().from(mediaFiles).where(eq(mediaFiles.id, idAjena));
    check("no borra el archivo de otro local", sigue.length === 1);
    await db.delete(mediaFiles).where(eq(mediaFiles.id, idAjena));
  }

  console.log("\nURLs");
  check("safeUrl acepta la ruta interna", safeUrl("/api/media/7/abc123.png") === "/api/media/7/abc123.png");
  check("safeUrl rechaza javascript:", safeUrl("javascript:alert(1)") === null);
  check("safeUrl rechaza rutas raras", safeUrl("/etc/passwd") === null);
  check("esArchivoPropio distingue externos", esArchivoPropio("/api/media/1/a.png") && !esArchivoPropio("https://x.com/a.png"));

  const reserva = reservationUrlFor(null, "5491133334444");
  check(
    "reservar arma el WhatsApp con el mensaje",
    reserva === "https://wa.me/5491133334444?text=Hola%2C%20quisiera%20reservar%20una%20mesa",
    reserva ?? "null"
  );
  check(
    "una plataforma propia gana sobre WhatsApp",
    reservationUrlFor("https://reservas.com/x", "5491133334444") === "https://reservas.com/x"
  );
  check("sin WhatsApp ni plataforma no hay botón", reservationUrlFor(null, null) === null);

  // Deja la base como estaba.
  await borrarArchivoDeUrl(urlPdf, locationId);

  console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} FALLO(S).\n`);
  await pool.end();
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
