/**
 * Paso 2 de 4 de la migración a la v2.
 *
 *   npm run migrate:reset -- --si
 *
 * Borra las tablas viejas para que `drizzle-kit push` pueda crear el esquema
 * nuevo desde cero.
 *
 * Por qué hace falta: `push` no sabe transformar la tabla `bracelets` de la v1
 * en la de la v2 (hay una columna NOT NULL nueva y otra que desaparece), así
 * que intenta recrearla, choca contra la clave foránea de `scans` y aborta a
 * mitad de camino. Es más limpio borrar y recrear, porque los datos ya están a
 * salvo en el JSON del paso anterior.
 *
 * ESTE SCRIPT BORRA TODAS LAS TABLAS. Exige:
 *   - que exista `migracion-v1.json` con datos adentro
 *   - que le pases `--si` explícitamente
 */
import "dotenv/config";

import { existsSync, readFileSync } from "node:fs";
import mysql from "mysql2/promise";

const ARCHIVO = "migracion-v1.json";

async function main() {
  if (!process.argv.includes("--si")) {
    console.error(
      "Este script borra todas las tablas de la base.\n" +
        "Si estás seguro y ya corriste `npm run migrate:export`, ejecutá:\n\n" +
        "  npm run migrate:reset -- --si\n"
    );
    process.exitCode = 1;
    return;
  }

  if (!existsSync(ARCHIVO)) {
    throw new Error(
      `No encontré ${ARCHIVO}. Corré primero: npm run migrate:export\n` +
        "Sin ese archivo, borrar las tablas te deja sin los datos."
    );
  }

  const datos = JSON.parse(readFileSync(ARCHIVO, "utf8"));
  const total =
    (datos.restaurants?.length ?? 0) +
    (datos.bracelets?.length ?? 0) +
    (datos.scans?.length ?? 0);

  if (total === 0) {
    throw new Error(
      `${ARCHIVO} está vacío. Volvé a correr el export apuntando a la base correcta.`
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL. Revisá tu archivo .env.");

  const conexion = await mysql.createConnection({ uri: url });

  try {
    const [filas] = await conexion.query<mysql.RowDataPacket[]>("SHOW TABLES");
    const tablas = filas.map((fila) => String(Object.values(fila)[0]));

    if (tablas.length === 0) {
      console.log("La base ya está vacía. Nada que hacer.");
      return;
    }

    console.log(`Respaldo verificado: ${total} filas en ${ARCHIVO}.`);
    console.log(`Borrando ${tablas.length} tablas…\n`);

    // Sin esto, el orden de borrado importaría por las claves foráneas.
    await conexion.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const tabla of tablas) {
      await conexion.query(`DROP TABLE IF EXISTS \`${tabla}\``);
      console.log(`  · ${tabla}`);
    }
    await conexion.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\nListo. Paso siguiente:  npm run db:push -- --force");
    console.log("Y después:              npm run migrate:import");
  } finally {
    await conexion.end();
  }
}

main().catch((error) => {
  console.error("\nLa limpieza falló:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
