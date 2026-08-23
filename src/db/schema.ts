import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  smallint,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/* ───────────────────────────────────────────────────────────────────────────
   Jerarquía del dominio

     account (la cuenta del cliente, lo que se factura)
       └── location (cada local con su propia landing pública)
             ├── waiter   (camareros)
             └── bracelet (pulseras, opcionalmente de un camarero)
                   └── scan

   Un escaneo guarda location_id, account_id y waiter_id desnormalizados: son
   los tres ejes por los que se filtra en los reportes y así se evitan joins
   en las consultas más frecuentes.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * De dónde sale la carta que ve el cliente.
 *   toqia → la que el local edita en /panel/carta, se actualiza sola
 *   pdf   → un PDF que el local subió y mantiene por su cuenta
 * Es una elección explícita del restaurante: antes se adivinaba (si había
 * platos ganaba la de Toqia) y nadie entendía por qué se mostraba una u otra.
 */
export const menuModes = ["toqia", "pdf"] as const;
export type MenuMode = (typeof menuModes)[number];

/** Formatos físicos que puede tener un dispositivo NFC. */
export const deviceTypes = ["pulsera", "placa"] as const;
export type DeviceType = (typeof deviceTypes)[number];

export const subscriptionStatuses = [
  "trial",
  "active",
  "past_due",
  "cancelled",
] as const;

export const accounts = mysqlTable(
  "accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),

    // Distribuidor asignado. Es un usuario con rol "distributor".
    // Se usa en la etapa 2; el campo ya queda listo para no migrar dos veces.
    distributorId: varchar("distributor_id", { length: 36 }),

    // Suscripción: por ahora la carga el admin a mano.
    subscriptionStatus: mysqlEnum("subscription_status", subscriptionStatuses)
      .notNull()
      .default("trial"),
    subscriptionPrice: decimal("subscription_price", { precision: 10, scale: 2 }),
    subscriptionExpiresAt: datetime("subscription_expires_at"),

    active: boolean("active").notNull().default(true),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (table) => [index("accounts_distributor_idx").on(table.distributorId)]
);

export const locations = mysqlTable(
  "locations",
  {
    id: int("id").autoincrement().primaryKey(),
    accountId: int("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    active: boolean("active").notNull().default(true),

    /* ── Contenido de la landing pública ──────────────────────────────────
       Todo esto lo edita el propio restaurante desde su panel. Los campos
       vacíos simplemente no muestran su botón: la página se arma con lo que
       haya cargado.

       Las URLs son TEXT y no varchar: con utf8mb4 cada varchar(2048) reserva
       8 KB dentro de la fila, y nueve columnas de URL superan el límite de
       65535 bytes por fila de InnoDB. TEXT se guarda aparte y en la fila deja
       solo un puntero. */

    // Si está vacío se usa `name`. Sirve para cuando el nombre comercial es
    // distinto del nombre interno.
    displayName: varchar("display_name", { length: 255 }),
    logoUrl: text("logo_url"),
    tagline: varchar("tagline", { length: 255 }),

    // El destino principal. Sin esto la landing no muestra el botón de reseña.
    googleReviewUrl: text("google_review_url"),

    instagramUrl: text("instagram_url"),
    // Solo dígitos con código de país, sin + ni espacios: 5491133334444
    whatsappPhone: varchar("whatsapp_phone", { length: 32 }),
    websiteUrl: text("website_url"),
    menuUrl: text("menu_url"),
    address: varchar("address", { length: 500 }),
    // Si está vacío pero hay dirección, la landing arma una búsqueda de Maps.
    mapsUrl: text("maps_url"),

    // Foto de portada, detrás del logo. Sin esto la cabecera queda en negro.
    coverImageUrl: text("cover_image_url"),
    // Teléfono para el botón de llamar. Puede ser distinto del de WhatsApp.
    phone: varchar("phone", { length: 32 }),
    // Reservas: link a la plataforma que use el local.
    reservationUrl: text("reservation_url"),

    // Textos de la página. Tienen valores por defecto en el render, así que
    // un local recién dado de alta ya muestra algo coherente.
    welcomeKicker: varchar("welcome_kicker", { length: 120 }),
    welcomeTitle: varchar("welcome_title", { length: 200 }),
    closingMessage: varchar("closing_message", { length: 200 }),
    closingImageUrl: text("closing_image_url"),
    // Imagen que encabeza la carta, arriba de las categorías.
    menuHeaderImageUrl: text("menu_header_image_url"),
    // Cuál de las dos cartas se muestra. Ver `menuModes`.
    menuMode: mysqlEnum("menu_mode", menuModes).notNull().default("toqia"),
    // Moneda con la que se muestran los precios de la carta.
    currency: varchar("currency", { length: 8 }).notNull().default("€"),

    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (table) => [index("locations_account_idx").on(table.accountId)]
);

/* ───────────────────────────────────────────────────────────────────────────
   Archivos subidos

   Logos, portadas, fotos de platos y cartas en PDF viven acá, dentro de la
   base, y se sirven por `/api/media/<id>/<token>`.

   Por qué en la base y no en el disco del servidor: en Coolify el contenedor
   se recrea en cada deploy y el disco se pierde con él. Guardarlos acá los
   hace sobrevivir a los deploys, entrar en el backup de la base junto con el
   resto de los datos, y funcionar igual en local que en producción sin montar
   volúmenes ni contratar un bucket.

   El `token` de la URL es el checksum del contenido: cuando el local cambia
   la foto cambia la URL, así que el navegador nunca muestra la anterior aunque
   la tenga cacheada para siempre.
   ─────────────────────────────────────────────────────────────────────────── */

/** MySQL: hasta 16 MB por archivo. `blob` a secas se queda en 64 KB. */
const mediumblob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "mediumblob",
});

export const mediaKinds = [
  "logo",
  "cover",
  "closing",
  "menu_pdf",
  "menu_header",
  "dish",
] as const;
export type MediaKind = (typeof mediaKinds)[number];

export const mediaFiles = mysqlTable(
  "media_files",
  {
    id: int("id").autoincrement().primaryKey(),
    // Al borrar un local se van sus archivos. Es la única forma de que no
    // queden megabytes huérfanos en la base para siempre.
    locationId: int("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),

    kind: mysqlEnum("kind", mediaKinds).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: int("size_bytes").notNull(),
    // SHA-256 del contenido. Va en la URL para invalidar el caché del navegador.
    checksum: varchar("checksum", { length: 64 }).notNull(),

    data: mediumblob("data").notNull(),

    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("media_files_location_idx").on(table.locationId)]
);

export const waiters = mysqlTable(
  "waiters",
  {
    id: int("id").autoincrement().primaryKey(),
    locationId: int("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("waiters_location_idx").on(table.locationId)]
);

/* ───────────────────────────────────────────────────────────────────────────
   Carta / menú

   Cada local arma su carta con categorías y platos. Es contenido que edita el
   propio restaurante y que ve el cliente al escanear, así que vive acá y no en
   un PDF externo: el local lo cambia desde su panel y se actualiza al toque.
   ─────────────────────────────────────────────────────────────────────────── */

export const menuCategories = mysqlTable(
  "menu_categories",
  {
    id: int("id").autoincrement().primaryKey(),
    locationId: int("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 255 }),
    // Id del ícono elegido en el panel (ver src/lib/menu-icons.ts). Se guarda
    // el id y no el SVG: si mañana cambia el dibujo, cambia en toda la app.
    icon: varchar("icon", { length: 32 }),
    // Orden en que se muestran. Lo maneja el panel con los botones de subir
    // y bajar; no se expone el número al usuario.
    position: smallint("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("menu_categories_location_idx").on(table.locationId)]
);

export const menuItems = mysqlTable(
  "menu_items",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryId: int("category_id")
      .notNull()
      .references(() => menuCategories.id, { onDelete: "cascade" }),
    // Desnormalizado: la carta pública se arma filtrando por local, y así no
    // hace falta pasar por categorías para saber de quién es cada plato.
    locationId: int("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 160 }).notNull(),
    description: varchar("description", { length: 500 }),
    // decimal y no float: con float, 19.90 se guarda como 19.899999618530273.
    price: decimal("price", { precision: 10, scale: 2 }),
    imageUrl: text("image_url"),

    position: smallint("position").notNull().default(0),
    // Sin stock hoy: se muestra tachado en vez de desaparecer, así el cliente
    // sabe que existe y puede preguntarlo mañana.
    available: boolean("available").notNull().default(true),
    active: boolean("active").notNull().default(true),

    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("menu_items_category_idx").on(table.categoryId),
    index("menu_items_location_idx").on(table.locationId),
  ]
);

export const bracelets = mysqlTable(
  "bracelets",
  {
    id: int("id").autoincrement().primaryKey(),
    // Lo que va grabado en el chip (ej. "B001"). Único en todo el sistema.
    code: varchar("code", { length: 50 }).notNull().unique(),

    locationId: int("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),

    // Camarero al que se le asignó. Null = pulsera de mesa, sin dueño.
    // onDelete: set null → borrar un camarero no borra sus pulseras.
    waiterId: int("waiter_id").references(() => waiters.id, {
      onDelete: "set null",
    }),

    // Formato físico del dispositivo. Cambia solo cómo se lo nombra en los
    // paneles; el funcionamiento es idéntico.
    deviceType: mysqlEnum("device_type", deviceTypes).notNull().default("pulsera"),

    label: varchar("label", { length: 255 }),

    // Excepción: si tiene valor, esta pulsera saltea la landing y redirige
    // directo acá. Sirve para campañas puntuales o para una pulsera que tiene
    // que ir a otro lado que el resto del local.
    overrideUrl: varchar("override_url", { length: 2048 }),

    active: boolean("active").notNull().default(true),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("bracelets_location_idx").on(table.locationId),
    index("bracelets_waiter_idx").on(table.waiterId),
  ]
);

export const scans = mysqlTable(
  "scans",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),

    // Identificador opaco que viaja a la landing. Cuando la persona toca el
    // botón de reseña, el navegador devuelve este token y así sabemos qué
    // escaneo terminó en Google. No se usa el id numérico para no exponer
    // cuántos escaneos tiene el sistema.
    token: varchar("token", { length: 36 }).notNull().unique(),

    braceletId: int("bracelet_id")
      .notNull()
      .references(() => bracelets.id, { onDelete: "cascade" }),
    locationId: int("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    accountId: int("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    // Se copia de la pulsera en el momento del escaneo. Si después la pulsera
    // cambia de camarero, los escaneos viejos siguen atribuidos al que la
    // tenía entonces, que es lo correcto para un ranking mensual.
    waiterId: int("waiter_id").references(() => waiters.id, {
      onDelete: "set null",
    }),

    scannedAt: datetime("scanned_at").notNull(),
    // Se completa si la persona tocó el botón de reseña. La tasa de
    // conversión sale de contar cuántos escaneos tienen esta columna llena.
    reviewClickedAt: datetime("review_clicked_at"),

    userAgent: varchar("user_agent", { length: 512 }),
    // SHA-256(salt + ip). Nunca se guarda la IP en claro.
    ipHash: varchar("ip_hash", { length: 64 }),
  },
  (table) => [
    index("scans_bracelet_idx").on(table.braceletId),
    index("scans_location_idx").on(table.locationId),
    index("scans_account_idx").on(table.accountId),
    index("scans_waiter_idx").on(table.waiterId),
    index("scans_scanned_at_idx").on(table.scannedAt),
    // Los reportes filtran por local y rango de fechas casi siempre.
    index("scans_location_scanned_idx").on(table.locationId, table.scannedAt),
    index("scans_account_scanned_idx").on(table.accountId, table.scannedAt),
    // Para la deduplicación de recargas: buscar el último escaneo de esta
    // pulsera desde el mismo dispositivo.
    index("scans_dedupe_idx").on(table.braceletId, table.ipHash, table.scannedAt),
  ]
);

/* ───────────────────────────────────────────────────────────────────────────
   Better Auth
   Los nombres de tabla y columna los impone Better Auth; no cambiarlos.
   `role` y `accountId` son campos adicionales declarados en src/lib/auth.ts.
   ─────────────────────────────────────────────────────────────────────────── */

export const userRoles = ["admin", "distributor", "restaurant"] as const;
export type UserRole = (typeof userRoles)[number];

export const user = mysqlTable(
  "user",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: text("name").notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),

    // admin: ve todo. distributor: sus cuentas asignadas. restaurant: la suya.
    role: mysqlEnum("role", userRoles).notNull().default("restaurant"),
    // Solo para role = "restaurant": a qué cuenta pertenece.
    accountId: int("accountId"),

    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("user_account_idx").on(table.accountId)]
);

export const session = mysqlTable("session", {
  id: varchar("id", { length: 36 }).primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: varchar("userId", { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = mysqlTable("account", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accountId: varchar("accountId", { length: 255 }).notNull(),
  providerId: varchar("providerId", { length: 255 }).notNull(),
  userId: varchar("userId", { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verification = mysqlTable("verification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ───────────────────────────────────────────────────────────────────────────
   Relaciones
   ─────────────────────────────────────────────────────────────────────────── */

export const accountsRelations = relations(accounts, ({ many }) => ({
  locations: many(locations),
  scans: many(scans),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  account: one(accounts, {
    fields: [locations.accountId],
    references: [accounts.id],
  }),
  waiters: many(waiters),
  bracelets: many(bracelets),
  scans: many(scans),
  menuCategories: many(menuCategories),
}));

export const menuCategoriesRelations = relations(
  menuCategories,
  ({ one, many }) => ({
    location: one(locations, {
      fields: [menuCategories.locationId],
      references: [locations.id],
    }),
    items: many(menuItems),
  })
);

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  location: one(locations, {
    fields: [menuItems.locationId],
    references: [locations.id],
  }),
}));

export const waitersRelations = relations(waiters, ({ one, many }) => ({
  location: one(locations, {
    fields: [waiters.locationId],
    references: [locations.id],
  }),
  bracelets: many(bracelets),
}));

export const braceletsRelations = relations(bracelets, ({ one, many }) => ({
  location: one(locations, {
    fields: [bracelets.locationId],
    references: [locations.id],
  }),
  waiter: one(waiters, {
    fields: [bracelets.waiterId],
    references: [waiters.id],
  }),
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  bracelet: one(bracelets, {
    fields: [scans.braceletId],
    references: [bracelets.id],
  }),
  location: one(locations, {
    fields: [scans.locationId],
    references: [locations.id],
  }),
  account: one(accounts, {
    fields: [scans.accountId],
    references: [accounts.id],
  }),
  waiter: one(waiters, { fields: [scans.waiterId], references: [waiters.id] }),
}));

/* Tipos derivados */
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Waiter = typeof waiters.$inferSelect;
export type NewWaiter = typeof waiters.$inferInsert;
export type Bracelet = typeof bracelets.$inferSelect;
export type NewBracelet = typeof bracelets.$inferInsert;
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type MenuCategory = typeof menuCategories.$inferSelect;
export type NewMenuCategory = typeof menuCategories.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
