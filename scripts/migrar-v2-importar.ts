/**
 * Paso 3 de 3 de la migración a la v2.
 *
 *   npm run migrate:import
 *
 * Lee `migracion-v1.json` y lo carga en el esquema nuevo:
 *
 *   restaurant (v1)  →  account + location (v2)
 *   bracelets.destination_url  →  locations.google_review_url
 *   scans.restaurant_id        →  scans.location_id + scans.account_id
 *   usuarios existentes        →  rol admin
 *
 * Se corre DESPUÉS de `npm run db:push -- --force`, que es lo que crea las
 * tablas nuevas. Aborta si encuentra datos cargados, para no duplicar nada si
 * alguien lo ejecuta dos veces.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { sql } from "drizzle-orm";

import { db, pool } from "../src/db";
import {
  account as authAccount,
  accounts,
  bracelets,
  locations,
  scans,
  user,
} from "../src/db/schema";

const ARCHIVO = "migracion-v1.json";

type Fila = Record<string, any>;

type Exportacion = {
  exportadoEl: string;
  restaurants: Fila[];
  bracelets: Fila[];
  scans: Fila[];
  user: Fila[];
  account: Fila[];
};

/** MySQL devuelve los booleanos como 0/1 y los datetime como Date o string. */
function aBooleano(valor: unknown): boolean {
  return valor === 1 || valor === true || valor === "1";
}

function aFecha(valor: unknown): Date {
  if (valor instanceof Date) return valor;
  const fecha = new Date(String(valor));
  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
}

async function main() {
  if (!existsSync(ARCHIVO)) {
    throw new Error(
      `No encontré ${ARCHIVO}. Corré primero: npm run migrate:export`
    );
  }

  const datos = JSON.parse(readFileSync(ARCHIVO, "utf8")) as Exportacion;

  console.log(`Importando el export del ${datos.exportadoEl}…\n`);

  // Guarda contra la doble ejecución: si ya hay cuentas, algo se cargó antes.
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(accounts);

  if (total > 0) {
    throw new Error(
      `La base ya tiene ${total} cuentas cargadas. Si querés reimportar, vaciá ` +
        `las tablas primero. Abortando para no duplicar datos.`
    );
  }

  // ── Cuentas y locales ─────────────────────────────────────────────────────
  // Cada restaurante de la v1 se convierte en una cuenta con un solo local.
  // Se conservan los ids originales para que las referencias de pulseras y
  // escaneos sigan siendo válidas sin tener que remapear nada.
  for (const restaurante of datos.restaurants) {
    await db.insert(accounts).values({
      id: restaurante.id,
      name: restaurante.name,
      slug: restaurante.slug,
      active: aBooleano(restaurante.active),
      subscriptionStatus: "active",
      createdAt: aFecha(restaurante.created_at),
    });

    // El destino deja de vivir en la pulsera y pasa al local. En la v1 todas
    // las pulseras de un restaurante apuntaban al mismo lugar, así que se toma
    // el de la primera.
    const primeraPulsera = datos.bracelets.find(
      (pulsera) => pulsera.restaurant_id === restaurante.id
    );

    await db.insert(locations).values({
      id: restaurante.id,
      accountId: restaurante.id,
      name: restaurante.name,
      slug: restaurante.slug,
      active: aBooleano(restaurante.active),
      displayName: restaurante.name,
      googleReviewUrl: primeraPulsera?.destination_url ?? null,
      createdAt: aFecha(restaurante.created_at),
    });
  }
  console.log(`  ${datos.restaurants.length} cuentas y locales creados`);

  // ── Pulseras ──────────────────────────────────────────────────────────────
  for (const pulsera of datos.bracelets) {
    // Si esta pulsera apuntaba a un destino distinto al del local, se conserva
    // como destino directo en vez de perderlo silenciosamente.
    const destinoDelLocal = datos.bracelets.find(
      (otra) => otra.restaurant_id === pulsera.restaurant_id
    )?.destination_url;

    const esDistinto =
      pulsera.destination_url && pulsera.destination_url !== destinoDelLocal;

    await db.insert(bracelets).values({
      id: pulsera.id,
      code: pulsera.code,
      locationId: pulsera.restaurant_id,
      waiterId: null,
      label: pulsera.label ?? null,
      overrideUrl: esDistinto ? pulsera.destination_url : null,
      active: aBooleano(pulsera.active),
      createdAt: aFecha(pulsera.created_at),
      updatedAt: aFecha(pulsera.updated_at),
    });
  }
  console.log(`  ${datos.bracelets.length} pulseras migradas`);

  // ── Escaneos ──────────────────────────────────────────────────────────────
  // Por lotes: miles de INSERT sueltos tardarían muchísimo.
  const TAMANIO_LOTE = 200;
  const filasScans = datos.scans.map((escaneo) => ({
    id: escaneo.id,
    // Los escaneos históricos no tienen token: nunca hubo una landing donde
    // tocar el botón. Se genera uno para cumplir la restricción de unicidad.
    token: randomUUID(),
    braceletId: escaneo.bracelet_id,
    locationId: escaneo.restaurant_id,
    accountId: escaneo.restaurant_id,
    waiterId: null,
    scannedAt: aFecha(escaneo.scanned_at),
    reviewClickedAt: null,
    userAgent: escaneo.user_agent ?? null,
    ipHash: escaneo.ip_hash ?? null,
  }));

  for (let i = 0; i < filasScans.length; i += TAMANIO_LOTE) {
    await db.insert(scans).values(filasScans.slice(i, i + TAMANIO_LOTE));
  }
  console.log(`  ${filasScans.length} escaneos migrados`);

  // ── Usuarios ──────────────────────────────────────────────────────────────
  // Los usuarios que ya existían son los del equipo: pasan a admin. Los hashes
  // de contraseña se copian tal cual, así siguen entrando con lo que ya sabían.
  for (const usuario of datos.user) {
    await db.insert(user).values({
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      emailVerified: aBooleano(usuario.emailVerified),
      image: usuario.image ?? null,
      role: "admin",
      accountId: null,
      createdAt: aFecha(usuario.createdAt),
      updatedAt: aFecha(usuario.updatedAt),
    });
  }

  for (const credencial of datos.account) {
    await db.insert(authAccount).values({
      id: credencial.id,
      accountId: credencial.accountId,
      providerId: credencial.providerId,
      userId: credencial.userId,
      accessToken: credencial.accessToken ?? null,
      refreshToken: credencial.refreshToken ?? null,
      idToken: credencial.idToken ?? null,
      scope: credencial.scope ?? null,
      password: credencial.password ?? null,
      createdAt: aFecha(credencial.createdAt),
      updatedAt: aFecha(credencial.updatedAt),
    });
  }
  console.log(`  ${datos.user.length} usuarios migrados (todos como admin)`);

  console.log("\nMigración terminada.");
  console.log("\nQué revisar ahora:");
  console.log("  · Cada local quedó con el destino de su primera pulsera.");
  console.log("  · Las pulseras que apuntaban a otro lado quedaron con");
  console.log("    'destino directo' cargado: revisalas en /admin/pulseras.");
  console.log("  · Los camareros hay que cargarlos: en la v1 no existían.");
}

main()
  .catch((error) => {
    console.error("\nLa importación falló:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
