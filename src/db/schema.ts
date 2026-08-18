import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  datetime,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/* ───────────────────────────────────────────────────────────────────────────
   Dominio
   ─────────────────────────────────────────────────────────────────────────── */

export const restaurants = mysqlTable("restaurants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const bracelets = mysqlTable(
  "bracelets",
  {
    id: int("id").autoincrement().primaryKey(),
    // Es lo que va en la URL grabada en el chip (ej. "B001"). Único global:
    // una pulsera pertenece a un solo restaurante y el código la identifica
    // sin ambigüedad en /r/[code].
    code: varchar("code", { length: 50 }).notNull().unique(),
    restaurantId: int("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    destinationUrl: varchar("destination_url", { length: 2048 }).notNull(),
    label: varchar("label", { length: 255 }),
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
    // El listado del panel filtra por restaurante todo el tiempo.
    index("bracelets_restaurant_id_idx").on(table.restaurantId),
  ]
);

export const scans = mysqlTable(
  "scans",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    braceletId: int("bracelet_id")
      .notNull()
      .references(() => bracelets.id, { onDelete: "cascade" }),
    // Desnormalizado a propósito: los reportes por restaurante son la consulta
    // más frecuente del dashboard y así se evita el join contra bracelets.
    restaurantId: int("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    // Siempre en UTC. La conversión a hora local pasa solo en el render.
    scannedAt: datetime("scanned_at").notNull(),
    userAgent: varchar("user_agent", { length: 512 }),
    // SHA-256(salt + ip). Nunca se guarda la IP en claro.
    ipHash: varchar("ip_hash", { length: 64 }),
  },
  (table) => [
    index("scans_bracelet_id_idx").on(table.braceletId),
    index("scans_restaurant_id_idx").on(table.restaurantId),
    index("scans_scanned_at_idx").on(table.scannedAt),
    // Índice compuesto para el gráfico por día filtrado por restaurante.
    index("scans_restaurant_scanned_idx").on(table.restaurantId, table.scannedAt),
  ]
);

/* ───────────────────────────────────────────────────────────────────────────
   Better Auth
   Los nombres de tabla y columna los impone Better Auth; no cambiarlos.
   ─────────────────────────────────────────────────────────────────────────── */

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

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
  // Hash de la contraseña para el proveedor "credential".
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
   Relaciones (para las queries relacionales de Drizzle)
   ─────────────────────────────────────────────────────────────────────────── */

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  bracelets: many(bracelets),
  scans: many(scans),
}));

export const braceletsRelations = relations(bracelets, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [bracelets.restaurantId],
    references: [restaurants.id],
  }),
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  bracelet: one(bracelets, {
    fields: [scans.braceletId],
    references: [bracelets.id],
  }),
  restaurant: one(restaurants, {
    fields: [scans.restaurantId],
    references: [restaurants.id],
  }),
}));

/* Tipos derivados, para no repetir shapes por toda la app. */
export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
export type Bracelet = typeof bracelets.$inferSelect;
export type NewBracelet = typeof bracelets.$inferInsert;
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
