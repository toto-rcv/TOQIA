/**
 * Semilla de desarrollo.
 *
 *   npm run db:seed
 *
 * Crea:
 *   - un usuario admin (credenciales en SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *   - dos restaurantes
 *   - cinco pulseras por restaurante, con destino de reseña de Google
 *   - ~200 escaneos repartidos en los últimos 30 días
 *
 * Es idempotente: se puede correr varias veces. No duplica restaurantes ni
 * pulseras, y solo genera escaneos si todavía no hay ninguno.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db, pool } from "../src/db";
import { account, bracelets, restaurants, scans, user } from "../src/db/schema";
import { auth } from "../src/lib/auth";
import { hashIp } from "../src/lib/hash";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@pulseras.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Administrador";

const TOTAL_ESCANEOS = 200;
const DIAS = 30;

/**
 * Destinos de reseña de Google.
 *
 * El formato `search.google.com/local/writereview?placeid=…` abre directamente
 * el cuadro de reseña. Los place IDs de acá son de ejemplo: reemplazalos por
 * los reales de cada local antes de grabar las pulseras de producción.
 */
const RESTAURANTES = [
  {
    name: "La Parrilla del Centro",
    slug: "la-parrilla-del-centro",
    destino:
      "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
    pulseras: [
      { code: "B001", label: "Mesa 1" },
      { code: "B002", label: "Mesa 2" },
      { code: "B003", label: "Mesa 3" },
      { code: "B004", label: "Barra" },
      { code: "B005", label: "Caja" },
    ],
  },
  {
    name: "Sushi Nikkei Palermo",
    slug: "sushi-nikkei-palermo",
    destino:
      "https://search.google.com/local/writereview?placeid=ChIJrTLr-GyuEmsRBfy61i59si0",
    pulseras: [
      { code: "S001", label: "Mesa 1" },
      { code: "S002", label: "Mesa 2" },
      { code: "S003", label: "Terraza" },
      { code: "S004", label: "Barra de sushi" },
      { code: "S005", label: "Delivery" },
    ],
  },
];

const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 12; motorola edge 30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
];

function elegir<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function crearAdmin(): Promise<void> {
  const existente = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1);

  if (existente.length > 0) {
    console.log(`· Usuario admin ya existe: ${ADMIN_EMAIL}`);
    return;
  }

  if (ADMIN_PASSWORD.length < 8) {
    throw new Error(
      "SEED_ADMIN_PASSWORD tiene que tener al menos 8 caracteres (es el mínimo que exige Better Auth)."
    );
  }

  // Usamos el hasher del propio Better Auth: si escribiéramos el hash a mano
  // con otro algoritmo, el login fallaría sin decir por qué.
  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(ADMIN_PASSWORD);

  const userId = randomUUID();
  const ahora = new Date();

  await db.insert(user).values({
    id: userId,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    emailVerified: true,
    createdAt: ahora,
    updatedAt: ahora,
  });

  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential", // proveedor de email + contraseña
    userId,
    password: passwordHash,
    createdAt: ahora,
    updatedAt: ahora,
  });

  console.log(`· Usuario admin creado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

async function crearRestaurantesYPulseras(): Promise<void> {
  for (const definicion of RESTAURANTES) {
    let restauranteId: number;

    const existente = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.slug, definicion.slug))
      .limit(1);

    if (existente.length > 0) {
      restauranteId = existente[0].id;
      console.log(`· Restaurante ya existe: ${definicion.name}`);
    } else {
      const [resultado] = await db.insert(restaurants).values({
        name: definicion.name,
        slug: definicion.slug,
        active: true,
        createdAt: new Date(),
      });
      restauranteId = resultado.insertId;
      console.log(`· Restaurante creado: ${definicion.name}`);
    }

    for (const pulsera of definicion.pulseras) {
      const yaExiste = await db
        .select({ id: bracelets.id })
        .from(bracelets)
        .where(eq(bracelets.code, pulsera.code))
        .limit(1);

      if (yaExiste.length > 0) continue;

      await db.insert(bracelets).values({
        code: pulsera.code,
        restaurantId: restauranteId,
        destinationUrl: definicion.destino,
        label: pulsera.label,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`  ${definicion.pulseras.length} pulseras verificadas`);
  }
}

/**
 * Genera escaneos con una distribución que se parece a la real: más los fines
 * de semana y concentrados en el horario de almuerzo y cena. Un dashboard con
 * datos planos no sirve para saber si el gráfico está bien.
 */
async function crearEscaneos(): Promise<void> {
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(scans);

  if (total > 0) {
    console.log(`· Ya hay ${total} escaneos cargados; no se generan más.`);
    return;
  }

  const pulseras = await db
    .select({
      id: bracelets.id,
      restaurantId: bracelets.restaurantId,
    })
    .from(bracelets);

  if (pulseras.length === 0) {
    console.log("· No hay pulseras: no se generan escaneos.");
    return;
  }

  const filas: {
    braceletId: number;
    restaurantId: number;
    scannedAt: Date;
    userAgent: string;
    ipHash: string | null;
  }[] = [];

  const ahora = new Date();

  for (let i = 0; i < TOTAL_ESCANEOS; i++) {
    const diasAtras = Math.floor(Math.random() * DIAS);

    const fecha = new Date(
      Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate() - diasAtras
      )
    );

    const finDeSemana = fecha.getUTCDay() === 5 || fecha.getUTCDay() === 6;
    // Los findes tienen más escaneos: si sale un día de semana, a veces lo
    // descartamos y volvemos a sortear.
    if (!finDeSemana && Math.random() < 0.3) {
      i--;
      continue;
    }

    // Franja de almuerzo (12–15) o de cena (20–23), en hora local aproximada.
    const almuerzo = Math.random() < 0.35;
    const hora = almuerzo
      ? 12 + Math.floor(Math.random() * 3)
      : 20 + Math.floor(Math.random() * 3);

    fecha.setUTCHours(hora, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);

    // El día de hoy todavía no terminó: si el sorteo cayó en una hora que no
    // llegó, volvemos a tirar. Sin esto quedarían escaneos con fecha futura y
    // el dashboard mostraría "escaneos hoy" que todavía no pasaron.
    if (fecha.getTime() > ahora.getTime()) {
      i--;
      continue;
    }

    const pulsera = elegir(pulseras);

    filas.push({
      braceletId: pulsera.id,
      restaurantId: pulsera.restaurantId,
      scannedAt: fecha,
      userAgent: elegir(USER_AGENTS),
      // IPs de ejemplo dentro de un /24: se guardan hasheadas, igual que en
      // producción.
      ipHash: hashIp(`190.51.24.${Math.floor(Math.random() * 254) + 1}`),
    });
  }

  // Insert por lotes: 200 filas en un solo INSERT es más rápido y evita
  // 200 idas y vueltas a la base.
  await db.insert(scans).values(filas);

  console.log(`· ${filas.length} escaneos generados en los últimos ${DIAS} días.`);
}

async function main() {
  console.log("Sembrando la base…\n");

  await crearAdmin();
  await crearRestaurantesYPulseras();
  await crearEscaneos();

  console.log("\nListo. Entrá a http://localhost:3000/admin");
}

main()
  .catch((error) => {
    console.error("\nLa semilla falló:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Sin esto el proceso queda colgado con el pool abierto.
    await pool.end();
  });
