import type mysql from "mysql2/promise";

/**
 * Puesta al día del esquema de una base que ya tiene datos.
 *
 * Vive acá y no en `scripts/` porque se usa desde dos lados:
 *
 *  - `npm run migrate` (scripts/migrar-esquema.ts), para desarrollo.
 *  - `/admin/mantenimiento`, para producción — donde normalmente no hay una
 *    terminal a mano y `tsx` es una dependencia de desarrollo que puede no
 *    estar instalada en el contenedor.
 *
 * Por qué existe esto y no alcanza con `drizzle-kit push`: ante *cualquier*
 * cambio de tipo de columna, push emite un `truncate table <tabla>` "por las
 * dudas" antes de tocar nada. Ese truncate falla siempre (MySQL no deja
 * truncar una tabla referenciada por una foreign key) y push aborta ahí,
 * dejando el resto de los cambios sin aplicar. Y si llegara a funcionar sería
 * peor: se llevaría los datos por delante.
 *
 * Acá cada cambio se aplica a mano, en orden, y sin borrar ni una fila. Cada
 * paso consulta `information_schema` antes de tocar nada, así que correrlo dos
 * veces no hace daño: la segunda vez no hay nada para hacer.
 */

export type EstadoPaso =
  /** Falta y hay que aplicarlo (solo aparece en el diagnóstico). */
  | "pendiente"
  /** Se acaba de aplicar. */
  | "aplicado"
  /** Ya estaba en la base. */
  | "ya-estaba"
  /** No corresponde en esta base (la columna vieja ni siquiera existe). */
  | "no-aplica";

export type PasoMigracion = {
  grupo: string;
  descripcion: string;
  estado: EstadoPaso;
};

export type InformeMigracion = {
  base: string;
  pasos: PasoMigracion[];
  pendientes: number;
  aplicados: number;
  yaEstaban: number;
  /** true si la base está al día: no queda ningún paso pendiente. */
  alDia: boolean;
};

/**
 * Revisa el esquema sin tocar nada y devuelve qué falta.
 * Es lo que muestra la página de mantenimiento antes de que nadie apriete
 * ningún botón.
 */
export function revisarEsquema(pool: mysql.Pool): Promise<InformeMigracion> {
  return recorrer(pool, true);
}

/** Aplica lo que falte. Idempotente: lo que ya está se saltea. */
export function aplicarMigraciones(pool: mysql.Pool): Promise<InformeMigracion> {
  return recorrer(pool, false);
}

/* ── Motor ────────────────────────────────────────────────────────────────── */

async function recorrer(
  pool: mysql.Pool,
  soloDiagnostico: boolean
): Promise<InformeMigracion> {
  const ctx = await crearContexto(pool, soloDiagnostico);

  if (!(await ctx.existeTabla("locations"))) {
    throw new Error(
      "La tabla `locations` no existe: esta base todavía no tiene el esquema " +
        "base. Corré `npm run db:push -- --force` sobre una base vacía antes " +
        "de migrar."
    );
  }

  await crearTablasDeCarta(ctx);
  await crearTablaDeArchivos(ctx);
  await agregarColumnas(ctx);
  await configurarModoDeCarta(ctx);
  await habilitarStockDePulseras(ctx);
  await ensancharEnums(ctx);
  await convertirUrlsATexto(ctx);
  await normalizarFechas(ctx);

  const pendientes = ctx.pasos.filter((p) => p.estado === "pendiente").length;
  const aplicados = ctx.pasos.filter((p) => p.estado === "aplicado").length;
  const yaEstaban = ctx.pasos.filter((p) => p.estado === "ya-estaba").length;

  return {
    base: ctx.base,
    pasos: ctx.pasos,
    pendientes,
    aplicados,
    yaEstaban,
    alDia: pendientes === 0,
  };
}

type Contexto = {
  base: string;
  soloDiagnostico: boolean;
  pasos: PasoMigracion[];
  grupo: string;
  existeTabla(tabla: string): Promise<boolean>;
  /** Tipo declarado de la columna, o null si no existe. */
  tipoColumna(tabla: string, columna: string): Promise<string | null>;
  existeIndice(tabla: string, indice: string): Promise<boolean>;
  /** Aplica un cambio (o lo anota como pendiente si es un diagnóstico). */
  correr(descripcion: string, sql: string): Promise<void>;
  anotar(descripcion: string, estado: EstadoPaso): void;
  consulta<T extends mysql.RowDataPacket[] | mysql.ResultSetHeader>(
    sql: string,
    valores?: unknown[]
  ): Promise<T>;
};

async function crearContexto(
  pool: mysql.Pool,
  soloDiagnostico: boolean
): Promise<Contexto> {
  const consulta = async <
    T extends mysql.RowDataPacket[] | mysql.ResultSetHeader,
  >(
    sql: string,
    valores?: unknown[]
  ): Promise<T> => {
    const [filas] = await pool.query<T>(sql, valores);
    return filas;
  };

  // Se le pregunta a la base cómo se llama en vez de deducirlo de la URL: así
  // funciona igual con una URL de conexión rara o con un socket.
  const filas = await consulta<mysql.RowDataPacket[]>(
    "SELECT DATABASE() AS base"
  );
  const base = String(filas[0]?.base ?? "");
  if (!base) {
    throw new Error("La conexión no tiene una base seleccionada.");
  }

  const ctx: Contexto = {
    base,
    soloDiagnostico,
    pasos: [],
    grupo: "",
    consulta,

    async existeTabla(tabla) {
      const filas = await consulta<mysql.RowDataPacket[]>(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
        [base, tabla]
      );
      return filas.length > 0;
    },

    async tipoColumna(tabla, columna) {
      const filas = await consulta<mysql.RowDataPacket[]>(
        `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [base, tabla, columna]
      );
      return filas.length > 0 ? String(filas[0].COLUMN_TYPE) : null;
    },

    async existeIndice(tabla, indice) {
      const filas = await consulta<mysql.RowDataPacket[]>(
        `SELECT 1 FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [base, tabla, indice]
      );
      return filas.length > 0;
    },

    anotar(descripcion, estado) {
      ctx.pasos.push({ grupo: ctx.grupo, descripcion, estado });
    },

    async correr(descripcion, sql) {
      if (soloDiagnostico) {
        ctx.anotar(descripcion, "pendiente");
        return;
      }
      try {
        await consulta<mysql.ResultSetHeader>(sql);
        ctx.anotar(descripcion, "aplicado");
      } catch (error) {
        // El mensaje de MySQL solo dice qué falló; sin saber en qué paso, no
        // sirve para arreglarlo.
        const detalle = error instanceof Error ? error.message : String(error);
        throw new Error(`Falló "${descripcion}": ${detalle}`, { cause: error });
      }
    },
  };

  return ctx;
}

/* ── 1. Tablas nuevas de la carta ─────────────────────────────────────────── */

async function crearTablasDeCarta(ctx: Contexto) {
  ctx.grupo = "Carta digital";

  if (await ctx.existeTabla("menu_categories")) {
    ctx.anotar("tabla menu_categories", "ya-estaba");
  } else {
    await ctx.correr(
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

  if (await ctx.existeTabla("menu_items")) {
    ctx.anotar("tabla menu_items", "ya-estaba");
  } else {
    await ctx.correr(
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
    if (await ctx.existeIndice(tabla, indice)) {
      ctx.anotar(`índice ${indice}`, "ya-estaba");
    } else {
      await ctx.correr(
        `índice ${indice}`,
        `CREATE INDEX \`${indice}\` ON \`${tabla}\` ${columnas}`
      );
    }
  }
}

/* ── 1b. Archivos subidos ─────────────────────────────────────────────────── */

async function crearTablaDeArchivos(ctx: Contexto) {
  ctx.grupo = "Archivos subidos";

  if (await ctx.existeTabla("media_files")) {
    ctx.anotar("tabla media_files", "ya-estaba");
  } else {
    // mediumblob: hasta 16 MB por archivo. `blob` a secas se queda en 64 KB y
    // no entra ni un logo.
    await ctx.correr(
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

  if (await ctx.existeIndice("media_files", "media_files_location_idx")) {
    ctx.anotar("índice media_files_location_idx", "ya-estaba");
  } else {
    await ctx.correr(
      "índice media_files_location_idx",
      "CREATE INDEX `media_files_location_idx` ON `media_files` (`location_id`)"
    );
  }
}

/* ── 2. Columnas nuevas ───────────────────────────────────────────────────── */

async function agregarColumnas(ctx: Contexto) {
  ctx.grupo = "Columnas nuevas";

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
    if (await ctx.tipoColumna(tabla, columna)) {
      ctx.anotar(`${tabla}.${columna}`, "ya-estaba");
    } else {
      await ctx.correr(
        `${tabla}.${columna}`,
        `ALTER TABLE \`${tabla}\` ADD \`${columna}\` ${definicion}`
      );
    }
  }
}

/* ── 2b. Qué carta muestra cada local ─────────────────────────────────────── */

async function configurarModoDeCarta(ctx: Contexto) {
  ctx.grupo = "Modo de carta";

  if (await ctx.tipoColumna("locations", "menu_mode")) {
    ctx.anotar("locations.menu_mode", "ya-estaba");
    return;
  }

  await ctx.correr(
    "locations.menu_mode",
    "ALTER TABLE `locations` ADD `menu_mode` enum('toqia','pdf') NOT NULL DEFAULT 'toqia'"
  );

  // Antes de esta columna la regla era implícita: si el local tenía platos
  // cargados ganaba la carta de Toqia, y si no, el PDF externo. Acá se congela
  // esa decisión para cada local, así ninguno se queda sin el botón "Ver menú"
  // el día que se sube este cambio.
  const backfill = `UPDATE locations l
        SET l.menu_mode = 'pdf'
      WHERE l.menu_url IS NOT NULL
        AND TRIM(l.menu_url) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM menu_items mi
            JOIN menu_categories mc ON mc.id = mi.category_id
           WHERE mi.location_id = l.id AND mi.active = 1 AND mc.active = 1
        )`;

  if (ctx.soloDiagnostico) {
    ctx.anotar("marcar qué locales siguen con su carta en PDF", "pendiente");
    return;
  }

  const resultado = await ctx.consulta<mysql.ResultSetHeader>(backfill);
  ctx.anotar(
    `${resultado.affectedRows} local(es) quedaron con su carta en PDF`,
    "aplicado"
  );
}

/* ── 2c. Stock de pulseras ────────────────────────────────────────────────── */

/**
 * Una pulsera puede existir sin local: en el stock de Toqia o en el de un
 * distribuidor. Para eso `location_id` deja de ser obligatoria y aparece
 * `distributor_id`.
 *
 * Nada de esto toca las pulseras que ya están puestas en un local: siguen con
 * su `location_id` y con `distributor_id` en NULL hasta que alguien diga quién
 * las colocó.
 */
async function habilitarStockDePulseras(ctx: Contexto) {
  ctx.grupo = "Stock de pulseras";

  if (await ctx.tipoColumna("bracelets", "distributor_id")) {
    ctx.anotar("bracelets.distributor_id", "ya-estaba");
  } else {
    await ctx.correr(
      "bracelets.distributor_id",
      "ALTER TABLE `bracelets` ADD `distributor_id` varchar(36)"
    );
  }

  if (await ctx.existeIndice("bracelets", "bracelets_distributor_idx")) {
    ctx.anotar("índice bracelets_distributor_idx", "ya-estaba");
  } else {
    await ctx.correr(
      "índice bracelets_distributor_idx",
      "CREATE INDEX `bracelets_distributor_idx` ON `bracelets` (`distributor_id`)"
    );
  }

  // `IS_NULLABLE` es lo único que dice si la columna ya admite NULL;
  // COLUMN_TYPE devuelve "int(11)" en los dos casos.
  const filas = await ctx.consulta<mysql.RowDataPacket[]>(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bracelets'
        AND COLUMN_NAME = 'location_id' LIMIT 1`,
    [ctx.base]
  );

  if (filas.length === 0) {
    ctx.anotar("bracelets.location_id (no existe)", "no-aplica");
  } else if (filas[0].IS_NULLABLE === "YES") {
    ctx.anotar("bracelets.location_id acepta NULL", "ya-estaba");
  } else {
    // La foreign key sobrevive al MODIFY: sigue siendo la misma columna, solo
    // cambia si admite NULL.
    await ctx.correr(
      "bracelets.location_id pasa a aceptar NULL",
      "ALTER TABLE `bracelets` MODIFY COLUMN `location_id` int NULL"
    );
  }
}

/* ── 2d. Valores nuevos en los enums ──────────────────────────────────────── */

/**
 * Los `enum` que crecieron con el tiempo.
 *
 * Este paso existe por un agujero real: las tablas se crean una sola vez, y
 * los pasos de arriba las saltean cuando ya existen. Si una tabla se creó con
 * una versión vieja del esquema, su enum se queda con los valores de entonces
 * para siempre. MySQL no avisa: acepta el INSERT y falla recién al escribir,
 * con un "Data truncated for column …" que no dice nada.
 *
 * Es lo que pasaba al subir la foto de un plato: `media_files.kind` no conocía
 * el valor "dish" y el guardado fallaba con un error genérico.
 */
const ENUMS: Array<{
  tabla: string;
  columna: string;
  valores: string[];
  definicion: string;
}> = [
  {
    tabla: "media_files",
    columna: "kind",
    valores: ["logo", "cover", "closing", "menu_pdf", "menu_header", "dish"],
    definicion:
      "enum('logo','cover','closing','menu_pdf','menu_header','dish') NOT NULL",
  },
  {
    tabla: "bracelets",
    columna: "device_type",
    valores: ["pulsera", "placa"],
    definicion: "enum('pulsera','placa') NOT NULL DEFAULT 'pulsera'",
  },
  {
    tabla: "locations",
    columna: "menu_mode",
    valores: ["toqia", "pdf"],
    definicion: "enum('toqia','pdf') NOT NULL DEFAULT 'toqia'",
  },
  {
    tabla: "accounts",
    columna: "subscription_status",
    valores: ["trial", "active", "past_due", "cancelled"],
    definicion:
      "enum('trial','active','past_due','cancelled') NOT NULL DEFAULT 'trial'",
  },
  {
    tabla: "user",
    columna: "role",
    valores: ["admin", "distributor", "restaurant"],
    definicion:
      "enum('admin','distributor','restaurant') NOT NULL DEFAULT 'restaurant'",
  },
];

async function ensancharEnums(ctx: Contexto) {
  ctx.grupo = "Valores de los enums";

  for (const { tabla, columna, valores, definicion } of ENUMS) {
    const tipo = await ctx.tipoColumna(tabla, columna);

    if (!tipo) {
      ctx.anotar(`${tabla}.${columna} (no existe)`, "no-aplica");
      continue;
    }

    const actuales = valoresDeEnum(tipo);
    const faltan = valores.filter((valor) => !actuales.includes(valor));

    if (faltan.length === 0) {
      ctx.anotar(`${tabla}.${columna}`, "ya-estaba");
      continue;
    }

    // Si la base tiene un valor que el código no conoce, aplicar la definición
    // nueva lo borraría de las filas que lo usan. Eso no lo arregla una
    // migración automática: se avisa y se sigue.
    const sobran = actuales.filter((valor) => !valores.includes(valor));
    if (sobran.length > 0) {
      ctx.anotar(
        `${tabla}.${columna}: la base tiene valores que el código no conoce (${sobran.join(", ")}); no se toca`,
        "no-aplica"
      );
      continue;
    }

    await ctx.correr(
      `${tabla}.${columna}: faltaba ${faltan.join(", ")}`,
      `ALTER TABLE \`${tabla}\` MODIFY COLUMN \`${columna}\` ${definicion}`
    );
  }
}

/** `enum('a','b')` → `["a", "b"]`. */
function valoresDeEnum(tipo: string): string[] {
  const contenido = tipo.match(/^enum\((.*)\)$/i);
  if (!contenido) return [];

  return contenido[1]
    .split(",")
    .map((parte) => parte.trim().replace(/^'|'$/g, "").replace(/''/g, "'"));
}

/* ── 3. varchar(2048) → TEXT en las URLs de locations ─────────────────────── */

async function convertirUrlsATexto(ctx: Contexto) {
  ctx.grupo = "URLs de locations a TEXT";

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
    const tipo = await ctx.tipoColumna("locations", columna);
    if (!tipo) {
      ctx.anotar(`locations.${columna} (no existe)`, "no-aplica");
    } else if (tipo.toLowerCase().startsWith("text")) {
      ctx.anotar(`locations.${columna}`, "ya-estaba");
    } else {
      // MySQL conserva el contenido al pasar de varchar a text.
      await ctx.correr(
        `locations.${columna}: ${tipo} → text`,
        `ALTER TABLE \`locations\` MODIFY COLUMN \`${columna}\` text`
      );
    }
  }
}

/* ── 4. Defaults de las columnas de fecha ─────────────────────────────────── */

async function normalizarFechas(ctx: Contexto) {
  ctx.grupo = "Defaults de created_at / updated_at";

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
    const filas = await ctx.consulta<mysql.RowDataPacket[]>(
      `SELECT COLUMN_DEFAULT, IS_NULLABLE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
      [ctx.base, tabla, columna]
    );

    if (filas.length === 0) {
      ctx.anotar(`${tabla}.${columna} (no existe)`, "no-aplica");
      continue;
    }

    const porDefecto = filas[0].COLUMN_DEFAULT;
    const yaEsta =
      typeof porDefecto === "string" &&
      porDefecto.toLowerCase().includes("current_timestamp") &&
      filas[0].IS_NULLABLE === "NO";

    if (yaEsta) {
      ctx.anotar(`${tabla}.${columna}`, "ya-estaba");
    } else {
      await ctx.correr(
        `${tabla}.${columna}`,
        `ALTER TABLE \`${tabla}\` MODIFY COLUMN \`${columna}\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP`
      );
    }
  }
}
