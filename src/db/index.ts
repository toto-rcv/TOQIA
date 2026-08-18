import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Pool de conexiones único por proceso.
 *
 * En desarrollo Next recarga los módulos en cada cambio; sin el cacheo en
 * `globalThis` se abriría un pool nuevo por recarga y MySQL terminaría
 * rechazando conexiones ("Too many connections").
 */
const globalForDb = globalThis as unknown as {
  __pulserasPool?: mysql.Pool;
};

function createPool(): mysql.Pool {
  return mysql.createPool({
    uri: env.databaseUrl,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    // Trabajamos siempre en UTC. Sin esto, mysql2 convierte los DATETIME a la
    // zona horaria del proceso y las fechas se corren.
    timezone: "Z",
    // El endpoint /r/[code] no puede quedarse colgado esperando la base.
    connectTimeout: 10_000,
    charset: "utf8mb4",
  });
}

export const pool: mysql.Pool = globalForDb.__pulserasPool ?? createPool();

if (!env.isProduction) {
  globalForDb.__pulserasPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";
