/**
 * Pone al día el esquema de una base que ya tiene datos.
 *
 *   npm run migrate
 *
 * La lógica de la migración vive en `src/lib/migraciones.ts`, no acá: la misma
 * rutina la usa el botón "Aplicar migraciones" de /admin/mantenimiento, que es
 * la única forma práctica de migrar producción (ahí no hay terminal y `tsx` es
 * una dependencia de desarrollo que puede no estar instalada).
 *
 * Este archivo es solo la cáscara de línea de comandos: abre la conexión,
 * llama a la librería e imprime el resultado.
 */

import "dotenv/config";
import mysql from "mysql2/promise";

import { aplicarMigraciones, revisarEsquema } from "../src/lib/migraciones";

/** `npm run migrate -- --dry-run` muestra qué falta sin tocar la base. */
const soloDiagnostico =
  process.argv.includes("--dry-run") || process.argv.includes("--diagnostico");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL. Revisá tu archivo .env.");

  const pool = mysql.createPool({ uri: url, timezone: "Z", connectionLimit: 2 });

  try {
    const informe = soloDiagnostico
      ? await revisarEsquema(pool)
      : await aplicarMigraciones(pool);

    console.log(
      soloDiagnostico
        ? `Revisando la base "${informe.base}"…`
        : `Poniendo al día la base "${informe.base}"…`
    );

    let grupoActual = "";
    for (const paso of informe.pasos) {
      if (paso.grupo !== grupoActual) {
        grupoActual = paso.grupo;
        console.log(`\n${grupoActual}`);
      }
      console.log(`  ${MARCA[paso.estado]} ${paso.descripcion}`);
    }

    if (soloDiagnostico) {
      console.log(
        informe.alDia
          ? "\nLa base está al día: no falta ningún cambio."
          : `\nFaltan ${informe.pendientes} cambio(s). Corré \`npm run migrate\` para aplicarlos.`
      );
    } else {
      console.log(
        `\nListo: ${informe.aplicados} cambio(s) aplicado(s), ` +
          `${informe.yaEstaban} que ya estaban.\n` +
          "Ahora podés correr `npm run db:seed` si querés datos de prueba."
      );
    }
  } finally {
    await pool.end();
  }
}

const MARCA = {
  pendiente: "→",
  aplicado: "✓",
  "ya-estaba": "·",
  "no-aplica": "·",
} as const;

main().catch((error) => {
  console.error("\nLa migración falló:");
  console.error(error);
  process.exit(1);
});
