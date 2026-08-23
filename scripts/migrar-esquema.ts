/**
 * Pone al día el esquema de una base que ya tiene datos.
 *
 *   npm run migrate
 *
 * Por qué existe este script y no alcanza con `drizzle-kit push`:
 * ante *cualquier* cambio de tipo de columna, push emite un
 * `truncate table <tabla>` "por las dudas" antes de tocar nada. Ese truncate
 * falla siempre (MySQL no deja truncar una tabla referenciada por una foreign
 * key) y push aborta ahí, dejando el resto de los cambios sin aplicar. Y si
 * llegara a funcionar sería peor: se llevaría los datos por delante.
 *
 * Acá cada cambio se aplica a mano, en orden, y sin borrar ni una fila.
 *
 * El script es idempotente: consulta information_schema antes de cada cambio y
 * saltea lo que ya está aplicado. Se puede correr las veces que haga falta, y
 * conviene correrlo después de cada `git pull`.
 */

import "dotenv/config";
import mysql from "mysql2/promise";

let conexion: mysql.Connection;
let nombreBase = "";
let aplicados = 0;
let salteados = 0;

async function existeTabla(tabla: string): Promise<boolean> {
  const [filas] = await conexion.query<mysql.RowDataPacket[]>(
    `SELECT 1 FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [nombreBase, tabla]
  );
  return filas.length > 0;
}

/** Devuelve el tipo declarado de la columna, o null si la columna no existe. */
async function tipoColumna(tabla: string, columna: string): Promise<string | null> {
  const [filas] = await conexion.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [nombreBase, tabla, columna]
  );
  return filas.length > 0 ? String(filas[0].COLUMN_TYPE) : null;
}

async function existeIndice(tabla: string, indice: string): Promise<boolean> {
  const [filas] = await conexion.query<mysql.RowDataPacket[]>(
    `SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [nombreBase, tabla, indice]
  );
  return filas.length > 0;
}

async function correr(descripcion: string, sql: string) {
  try {
    await conexion.query(sql);
    console.log(`  ✓ ${descripcion}`);
    aplicados += 1;
  } catch (error) {
    console.error(`  ✗ ${descripcion}`);
    throw error;
  }
}

function saltear(descripcion: string) {
  console.log(`  · ${descripcion} (ya estaba)`);
  salteados += 1;
}

/* ── 1. Tablas nuevas de la carta ──────────────────────────────────────── */

async function crearTablasDeCarta() {
  console.log("\nCarta digital");

  if (await existeTabla("menu_categories")) {
    saltear("tabla menu_categories");
  } else {
    await correr(
      "tabla menu_categories",
      `CREATE TABLE \`menu_categories\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`location_id\` int NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`description\` varchar(255),
        \`position\` smallint NOT NULL DEFAULT 0,
        \`active\` boolean NOT NULL DEFAULT true,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`menu_categories_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`menu_categories_location_id_locations_id_fk\`
          FOREIGN KEY (\`location_id\`) REFERENCES \`locations\`(\`id\`) ON DELETE cascade
      )`
    );
  }

  if (await existeTabla("menu_items")) {
    saltear("tabla menu_items");
  } else {
    await correr(
      "tabla menu_items",
      `CREATE TABLE \`menu_items\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`category_id\` int NOT NULL,
        \`location_id\` int NOT NULL,
        \`name\` varchar(160) NOT NULL,
        \`description\` varchar(500),
        \`price\` decimal(10,2),
        \`image_url\` text,
        \`position\` smallint NOT NULL DEFAULT 0,
        \`available\` boolean NOT NULL DEFAULT true,
        \`active\` boolean NOT NULL DEFAULT true,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`menu_items_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`menu_items_category_id_menu_categories_id_fk\`
          FOREIGN KEY (\`category_id\`) REFERENCES \`menu_categories\`(\`id\`) ON DELETE cascade,
        CONSTRAINT \`menu_items_location_id_locations_id_fk\`
          FOREIGN KEY (\`location_id\`) REFERENCES \`locations\`(\`id\`) ON DELETE cascade
      )`
    );
  }

  const indices: Array<[string, string, string]> = [
    ["menu_categories", "menu_categories_location_idx", "(`location_id`)"],
    ["menu_items", "menu_items_category_idx", "(`category_id`)"],
    ["menu_items", "menu_items_location_idx", "(`location_id`)"],
  ];

  for (const [tabla, indice, columnas] of indices) {
    if (await existeIndice(tabla, indice)) {
      saltear(`índice ${indice}`);
    } else {
      await correr(
        `índice ${indice}`,
        `CREATE INDEX \`${indice}\` ON \`${tabla}\` ${columnas}`
      );
    }
  }
}

/* ── 1b. Archivos subidos ──────────────────────────────────────────────── */

async function crearTablaDeArchivos() {
  console.log("\nArchivos subidos");

  if (await existeTabla("media_files")) {
    saltear("tabla media_files");
  } else {
    // mediumblob: hasta 16 MB por archivo. `blob` a secas se queda en 64 KB y
    // no entra ni un logo.
    await correr(
      "tabla media_files",
      `CREATE TABLE \`media_files\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`location_id\` int NOT NULL,
        \`kind\` enum('logo','cover','closing','menu_pdf','menu_header','dish') NOT NULL,
        \`filename\` varchar(255) NOT NULL,
        \`mime_type\` varchar(100) NOT NULL,
        \`size_bytes\` int NOT NULL,
        \`checksum\` varchar(64) NOT NULL,
        \`data\` mediumblob NOT NULL,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`media_files_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`media_files_location_id_locations_id_fk\`
          FOREIGN KEY (\`location_id\`) REFERENCES \`locations\`(\`id\`) ON DELETE cascade
      )`
    );
  }

  if (await existeIndice("media_files", "media_files_location_idx")) {
    saltear("índice media_files_location_idx");
  } else {
    await correr(
      "índice media_files_location_idx",
      "CREATE INDEX `media_files_location_idx` ON `media_files` (`location_id`)"
    );
  }
}

/* ── 2. Columnas nuevas ────────────────────────────────────────────────── */

async function agregarColumnas() {
  console.log("\nColumnas nuevas");

  const nuevas: Array<[string, string, string]> = [
    ["bracelets", "device_type", "enum('pulsera','placa') NOT NULL DEFAULT 'pulsera'"],
    ["locations", "menu_header_image_url", "text"],
    ["menu_categories", "icon", "varchar(32)"],
    ["locations", "cover_image_url", "text"],
    ["locations", "phone", "varchar(32)"],
    ["locations", "reservation_url", "text"],
    ["locations", "welcome_kicker", "varchar(120)"],
    ["locations", "welcome_title", "varchar(200)"],
    ["locations", "closing_message", "varchar(200)"],
    ["locations", "closing_image_url", "text"],
    ["locations", "currency", "varchar(8) NOT NULL DEFAULT '€'"],
  ];

  for (const [tabla, columna, definicion] of nuevas) {
    if (await tipoColumna(tabla, columna)) {
      saltear(`${tabla}.${columna}`);
    } else {
      await correr(
        `${tabla}.${columna}`,
        `ALTER TABLE \`${tabla}\` ADD \`${columna}\` ${definicion}`
      );
    }
  }
}

/* ── 2b. Qué carta muestra cada local ──────────────────────────────────── */

async function configurarModoDeCarta() {
  console.log("\nModo de carta");

  if (await tipoColumna("locations", "menu_mode")) {
    saltear("locations.menu_mode");
    return;
  }

  await correr(
    "locations.menu_mode",
    "ALTER TABLE `locations` ADD `menu_mode` enum('toqia','pdf') NOT NULL DEFAULT 'toqia'"
  );

  // Antes de esta columna, la regla era implícita: si el local tenía platos
  // cargados ganaba la carta de Toqia, y si no, el PDF externo. Acá se
  // congela esa decisión para cada local, así ninguno se queda sin el botón
  // "Ver menú" el día que se sube este cambio.
  const [resultado] = await conexion.query<mysql.ResultSetHeader>(
    `UPDATE locations l
        SET l.menu_mode = 'pdf'
      WHERE l.menu_url IS NOT NULL
        AND TRIM(l.menu_url) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM menu_items mi
            JOIN menu_categories mc ON mc.id = mi.category_id
           WHERE mi.location_id = l.id AND mi.active = 1 AND mc.active = 1
        )`
  );
  console.log(
    `  ✓ ${resultado.affectedRows} local(es) quedaron con su carta en PDF; el resto usa la de Toqia`
  );
  aplicados += 1;
}

/* ── 3. varchar(2048) → TEXT en las URLs de locations ──────────────────── */

async function convertirUrlsATexto() {
  console.log("\nURLs de locations a TEXT");

  // Nueve columnas de URL a varchar(2048) con utf8mb4 reservan más de 65535
  // bytes por fila y MySQL rechaza el INSERT con "Row size too large".
  const columnas = [
    "logo_url",
    "google_review_url",
    "instagram_url",
    "website_url",
    "menu_url",
    "maps_url",
  ];

  for (const columna of columnas) {
    const tipo = await tipoColumna("locations", columna);
    if (!tipo) {
      console.log(`  · locations.${columna} no existe, se saltea`);
      salteados += 1;
    } else if (tipo.toLowerCase().startsWith("text")) {
      saltear(`locations.${columna}`);
    } else {
      // MySQL conserva el contenido al pasar de varchar a text.
      await correr(
        `locations.${columna}: ${tipo} → text`,
        `ALTER TABLE \`locations\` MODIFY COLUMN \`${columna}\` text`
      );
    }
  }
}

/* ── 4. Defaults de las columnas de fecha ──────────────────────────────── */

async function normalizarFechas() {
  console.log("\nDefaults de created_at / updated_at");

  const columnas: Array<[string, string]> = [
    ["accounts", "created_at"],
    ["accounts", "updated_at"],
    ["bracelets", "created_at"],
    ["bracelets", "updated_at"],
    ["locations", "created_at"],
    ["locations", "updated_at"],
    ["waiters", "created_at"],
  ];

  for (const [tabla, columna] of columnas) {
    const [filas] = await conexion.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_DEFAULT, IS_NULLABLE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
      [nombreBase, tabla, columna]
    );
    if (filas.length === 0) {
      console.log(`  · ${tabla}.${columna} no existe, se saltea`);
      salteados += 1;
      continue;
    }

    const porDefecto = filas[0].COLUMN_DEFAULT;
    const yaEsta =
      typeof porDefecto === "string" &&
      porDefecto.toLowerCase().includes("current_timestamp") &&
      filas[0].IS_NULLABLE === "NO";

    if (yaEsta) {
      saltear(`${tabla}.${columna}`);
    } else {
      await correr(
        `${tabla}.${columna}`,
        `ALTER TABLE \`${tabla}\` MODIFY COLUMN \`${columna}\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP`
      );
    }
  }
}

/* ── Ejecución ─────────────────────────────────────────────────────────── */

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL. Revisá tu archivo .env.");

  nombreBase = new URL(url).pathname.replace(/^\//, "");
  if (!nombreBase) {
    throw new Error(`No pude deducir el nombre de la base desde DATABASE_URL: ${url}`);
  }

  conexion = await mysql.createConnection({ uri: url, timezone: "Z" });

  try {
    console.log(`Poniendo al día la base "${nombreBase}"…`);

    if (!(await existeTabla("locations"))) {
      throw new Error(
        "La tabla `locations` no existe: esta base todavía no tiene el esquema base.\n" +
          "Corré primero `npm run db:push -- --force` sobre una base vacía."
      );
    }

    await crearTablasDeCarta();
    await crearTablaDeArchivos();
    await agregarColumnas();
    await configurarModoDeCarta();
    await convertirUrlsATexto();
    await normalizarFechas();

    console.log(
      `\nListo: ${aplicados} cambio(s) aplicado(s), ${salteados} que ya estaban.\n` +
        "Ahora podés correr `npm run db:seed` si querés datos de prueba."
    );
  } finally {
    await conexion.end();
  }
}

main().catch((error) => {
  console.error("\nLa migración falló:");
  console.error(error);
  process.exit(1);
});
