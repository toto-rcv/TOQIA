/**
 * Paso 1 de 3 de la migración a la v2.
 *
 *   npm run migrate:export
 *
 * Lee la base con el esquema viejo (restaurants / bracelets con
 * destination_url / scans) y deja todo en `migracion-v1.json`.
 *
 * No modifica nada: solo lee. Se puede correr las veces que haga falta.
 *
 * Por qué exportar en vez de migrar con ALTER TABLE: `drizzle-kit push`
 * compara el esquema real contra el del código y, si encuentra columnas que
 * sobran, decide recrear la tabla — lo que termina truncando los datos.
 * Sacarlos de la base primero y volver a meterlos después evita esa pelea por
 * completo.
 */
import "dotenv/config";

import { writeFileSync } from "node:fs";
import mysql from "mysql2/promise";

const ARCHIVO = "migracion-v1.json";

type Fila = Record<string, unknown>;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL. Revisá tu archivo .env.");

  const conexion = await mysql.createConnection({ uri: url, timezone: "Z" });

  try {
    console.log("Exportando la base actual…\n");

    const tablas = await listarTablas(conexion);
    const requeridas = ["restaurants", "bracelets", "scans"];
    const faltantes = requeridas.filter((tabla) => !tablas.includes(tabla));

    if (faltantes.length > 0) {
      throw new Error(
        `No encontré ${faltantes.join(", ")} en esta base. ¿Estás apuntando a la base correcta? ` +
          `Si ya migraste, este paso no hace falta.`
      );
    }

    const datos = {
      exportadoEl: new Date().toISOString(),
      restaurants: await leer(conexion, "restaurants"),
      bracelets: await leer(conexion, "bracelets"),
      scans: await leer(conexion, "scans"),
      // Los usuarios y sus credenciales se conservan tal cual: los hashes de
      // contraseña tienen que sobrevivir o nadie puede volver a entrar.
      user: tablas.includes("user") ? await leer(conexion, "user") : [],
      account: tablas.includes("account") ? await leer(conexion, "account") : [],
    };

    writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2), "utf8");

    console.log(`  restaurantes  ${datos.restaurants.length}`);
    console.log(`  pulseras      ${datos.bracelets.length}`);
    console.log(`  escaneos      ${datos.scans.length}`);
    console.log(`  usuarios      ${datos.user.length}`);
    console.log(`\nListo: ${ARCHIVO}`);
    console.log("\nPaso siguiente:  npm run db:push -- --force");
    console.log("Y después:       npm run migrate:import");
  } finally {
    await conexion.end();
  }
}

async function listarTablas(conexion: mysql.Connection): Promise<string[]> {
  const [filas] = await conexion.query<mysql.RowDataPacket[]>("SHOW TABLES");
  return filas.map((fila) => String(Object.values(fila)[0]));
}

async function leer(conexion: mysql.Connection, tabla: string): Promise<Fila[]> {
  const [filas] = await conexion.query<mysql.RowDataPacket[]>(
    `SELECT * FROM \`${tabla}\``
  );
  return filas as Fila[];
}

main().catch((error) => {
  console.error("\nLa exportación falló:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
