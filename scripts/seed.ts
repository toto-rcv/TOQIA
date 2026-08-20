/**
 * Semilla de desarrollo.
 *
 *   npm run db:seed
 *
 * Crea un sistema completo para poder probar los tres roles:
 *   - un admin y un distribuidor
 *   - dos cuentas de cliente (una con dos locales, otra con uno)
 *   - un usuario de restaurante por cuenta
 *   - camareros y pulseras por local, algunas asignadas
 *   - ~400 escaneos de los últimos 45 días, con clics a reseña
 *
 * Es idempotente: se puede correr varias veces sin duplicar nada, y solo
 * genera escaneos si la tabla está vacía.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db, pool } from "../src/db";
import {
  account as authAccount,
  accounts,
  bracelets,
  locations,
  scans,
  user,
  waiters,
} from "../src/db/schema";
import { auth } from "../src/lib/auth";
import { hashIp } from "../src/lib/hash";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@toqia.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Administrador";

const TOTAL_ESCANEOS = 400;
const DIAS = 45;
/** Proporción de escaneos que terminan en la reseña de Google. */
const TASA_CONVERSION = 0.38;

/**
 * Los place IDs son de ejemplo. Reemplazalos por los reales de cada local
 * antes de grabar pulseras de producción.
 */
const REVIEW_URL_1 =
  "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";
const REVIEW_URL_2 =
  "https://search.google.com/local/writereview?placeid=ChIJrTLr-GyuEmsRBfy61i59si0";

const CUENTAS = [
  {
    name: "Grupo Gastronómico Norte",
    slug: "grupo-gastronomico-norte",
    usuario: { email: "norte@toqia.local", password: "norte1234", name: "Marina Ruiz" },
    locales: [
      {
        name: "La Parrilla del Centro",
        slug: "la-parrilla-del-centro",
        displayName: "La Parrilla del Centro",
        tagline: "Asado a la parrilla desde 1998",
        googleReviewUrl: REVIEW_URL_1,
        instagramUrl: "https://instagram.com/laparrilladelcentro",
        whatsappPhone: "5491133334444",
        menuUrl: "https://laparrilladelcentro.com.ar/menu",
        websiteUrl: "https://laparrilladelcentro.com.ar",
        address: "Av. Corrientes 1234, CABA",
        prefijo: "B",
        camareros: ["Diego Fernández", "Lucía Paz", "Martín Sosa"],
      },
      {
        name: "La Parrilla Vicente López",
        slug: "la-parrilla-vicente-lopez",
        displayName: "La Parrilla · Vicente López",
        tagline: "La misma parrilla, frente al río",
        googleReviewUrl: REVIEW_URL_1,
        instagramUrl: "https://instagram.com/laparrilladelcentro",
        whatsappPhone: "5491144445555",
        menuUrl: "https://laparrilladelcentro.com.ar/menu",
        websiteUrl: "https://laparrilladelcentro.com.ar",
        address: "Paseo de la Costa 500, Vicente López",
        prefijo: "V",
        camareros: ["Carla Méndez", "Nicolás Ferrari"],
      },
    ],
  },
  {
    name: "Nikkei Palermo",
    slug: "nikkei-palermo",
    usuario: { email: "nikkei@toqia.local", password: "nikkei1234", name: "Tomás Aoki" },
    locales: [
      {
        name: "Sushi Nikkei Palermo",
        slug: "sushi-nikkei-palermo",
        displayName: "Nikkei",
        tagline: "Cocina nikkei en Palermo Soho",
        googleReviewUrl: REVIEW_URL_2,
        instagramUrl: "https://instagram.com/nikkeipalermo",
        whatsappPhone: "5491155556666",
        menuUrl: "https://nikkeipalermo.com/carta",
        websiteUrl: "https://nikkeipalermo.com",
        address: "Gorriti 4800, CABA",
        prefijo: "S",
        camareros: ["Ana Torres", "Julián Vera"],
      },
    ],
  },
];

const DISTRIBUIDOR = {
  email: "distribuidor@toqia.local",
  password: "distri1234",
  name: "Pablo Giménez",
};

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

/**
 * Crea un usuario con su credencial.
 *
 * Usa el hasher del propio Better Auth: si escribiéramos el hash a mano con
 * otro algoritmo, el login fallaría sin decir por qué.
 */
async function crearUsuario(datos: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "distributor" | "restaurant";
  accountId?: number;
}): Promise<string> {
  const existentes = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, datos.email))
    .limit(1);

  if (existentes[0]) {
    console.log(`· Usuario ya existe: ${datos.email}`);
    return existentes[0].id;
  }

  if (datos.password.length < 8) {
    throw new Error(
      `La contraseña de ${datos.email} tiene menos de 8 caracteres, que es el mínimo de Better Auth.`
    );
  }

  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(datos.password);

  const userId = randomUUID();
  const ahora = new Date();

  await db.insert(user).values({
    id: userId,
    name: datos.name,
    email: datos.email,
    emailVerified: true,
    role: datos.role,
    accountId: datos.accountId ?? null,
    createdAt: ahora,
    updatedAt: ahora,
  });

  await db.insert(authAccount).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: ahora,
    updatedAt: ahora,
  });

  console.log(`· Usuario creado: ${datos.email} / ${datos.password} (${datos.role})`);
  return userId;
}

async function main() {
  console.log("Sembrando la base…\n");

  await crearUsuario({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    name: ADMIN_NAME,
    role: "admin",
  });

  const distribuidorId = await crearUsuario({
    ...DISTRIBUIDOR,
    role: "distributor",
  });

  for (const definicion of CUENTAS) {
    // ── Cuenta ─────────────────────────────────────────────────────────────
    let accountId: number;
    const cuentaExistente = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.slug, definicion.slug))
      .limit(1);

    if (cuentaExistente[0]) {
      accountId = cuentaExistente[0].id;
      console.log(`· Cuenta ya existe: ${definicion.name}`);
    } else {
      const vence = new Date();
      vence.setMonth(vence.getMonth() + 6);

      const [resultado] = await db.insert(accounts).values({
        name: definicion.name,
        slug: definicion.slug,
        distributorId: distribuidorId,
        subscriptionStatus: "active",
        subscriptionPrice: "35000.00",
        subscriptionExpiresAt: vence,
        active: true,
      });
      accountId = resultado.insertId;
      console.log(`· Cuenta creada: ${definicion.name}`);
    }

    await crearUsuario({
      ...definicion.usuario,
      role: "restaurant",
      accountId,
    });

    // ── Locales ────────────────────────────────────────────────────────────
    for (const local of definicion.locales) {
      let locationId: number;
      const localExistente = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.slug, local.slug))
        .limit(1);

      if (localExistente[0]) {
        locationId = localExistente[0].id;
      } else {
        const [resultado] = await db.insert(locations).values({
          accountId,
          name: local.name,
          slug: local.slug,
          displayName: local.displayName,
          tagline: local.tagline,
          googleReviewUrl: local.googleReviewUrl,
          instagramUrl: local.instagramUrl,
          whatsappPhone: local.whatsappPhone,
          menuUrl: local.menuUrl,
          websiteUrl: local.websiteUrl,
          address: local.address,
          active: true,
        });
        locationId = resultado.insertId;
        console.log(`  Local creado: ${local.name}`);
      }

      // ── Camareros ────────────────────────────────────────────────────────
      const camarerosIds: number[] = [];
      for (const nombre of local.camareros) {
        const existente = await db
          .select({ id: waiters.id })
          .from(waiters)
          .where(eq(waiters.locationId, locationId))
          .limit(50);

        const yaEsta = existente.length >= local.camareros.length;
        if (yaEsta) {
          camarerosIds.push(...existente.map((fila) => fila.id));
          break;
        }

        const [resultado] = await db.insert(waiters).values({
          locationId,
          name: nombre,
          active: true,
        });
        camarerosIds.push(resultado.insertId);
      }

      // ── Pulseras ─────────────────────────────────────────────────────────
      // Cinco por local: las tres primeras a camareros, el resto de mesa.
      for (let i = 1; i <= 5; i++) {
        const code = `${local.prefijo}${String(i).padStart(3, "0")}`;

        const existente = await db
          .select({ id: bracelets.id })
          .from(bracelets)
          .where(eq(bracelets.code, code))
          .limit(1);
        if (existente[0]) continue;

        const camareroId = camarerosIds[i - 1] ?? null;

        await db.insert(bracelets).values({
          code,
          locationId,
          waiterId: camareroId,
          label: camareroId ? null : `Mesa ${i}`,
          active: true,
        });
      }

      console.log(`  ${local.camareros.length} camareros y 5 pulseras verificados`);
    }
  }

  await crearEscaneos();

  console.log("\nListo. Entrá a http://localhost:3000/login");
  console.log("\n  Admin         " + ADMIN_EMAIL + " / " + ADMIN_PASSWORD);
  console.log("  Distribuidor  " + DISTRIBUIDOR.email + " / " + DISTRIBUIDOR.password);
  for (const cuenta of CUENTAS) {
    console.log(
      `  Restaurante   ${cuenta.usuario.email} / ${cuenta.usuario.password}  (${cuenta.name})`
    );
  }
}

/**
 * Escaneos con una distribución parecida a la real: más los fines de semana y
 * concentrados en almuerzo y cena. Un dashboard con datos planos no sirve para
 * saber si los gráficos están bien.
 */
async function crearEscaneos(): Promise<void> {
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(scans);

  if (total > 0) {
    console.log(`\n· Ya hay ${total} escaneos cargados; no se generan más.`);
    return;
  }

  const pulseras = await db
    .select({
      id: bracelets.id,
      locationId: bracelets.locationId,
      waiterId: bracelets.waiterId,
      accountId: locations.accountId,
    })
    .from(bracelets)
    .innerJoin(locations, eq(bracelets.locationId, locations.id));

  if (pulseras.length === 0) {
    console.log("\n· No hay pulseras: no se generan escaneos.");
    return;
  }

  const ahora = new Date();
  const filas: (typeof scans.$inferInsert)[] = [];

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
    if (!finDeSemana && Math.random() < 0.3) {
      i--;
      continue;
    }

    const almuerzo = Math.random() < 0.35;
    const hora = almuerzo
      ? 15 + Math.floor(Math.random() * 3) // ~12-14 hora local
      : 23 + Math.floor(Math.random() * 1); // ~20-21 hora local

    fecha.setUTCHours(
      hora % 24,
      Math.floor(Math.random() * 60),
      Math.floor(Math.random() * 60),
      0
    );

    // El día de hoy todavía no terminó: si el sorteo cayó en una hora que no
    // llegó, volvemos a tirar en vez de crear escaneos con fecha futura.
    if (fecha.getTime() > ahora.getTime()) {
      i--;
      continue;
    }

    const pulsera = elegir(pulseras);

    // Una parte de los escaneos termina tocando el botón de reseña, entre 5 y
    // 90 segundos después de llegar a la página.
    const convirtio = Math.random() < TASA_CONVERSION;
    const reviewClickedAt = convirtio
      ? new Date(fecha.getTime() + (5 + Math.floor(Math.random() * 85)) * 1000)
      : null;

    filas.push({
      token: randomUUID(),
      braceletId: pulsera.id,
      locationId: pulsera.locationId,
      accountId: pulsera.accountId,
      waiterId: pulsera.waiterId,
      scannedAt: fecha,
      reviewClickedAt,
      userAgent: elegir(USER_AGENTS),
      // IPs de ejemplo dentro de un /24, guardadas hasheadas igual que en
      // producción.
      ipHash: hashIp(`190.51.24.${Math.floor(Math.random() * 254) + 1}`),
    });
  }

  // Insert por lotes: 400 filas en pocos INSERT en vez de 400 idas y vueltas.
  const TAMANIO_LOTE = 100;
  for (let i = 0; i < filas.length; i += TAMANIO_LOTE) {
    await db.insert(scans).values(filas.slice(i, i + TAMANIO_LOTE));
  }

  const conversiones = filas.filter((fila) => fila.reviewClickedAt).length;
  console.log(
    `\n· ${filas.length} escaneos generados en los últimos ${DIAS} días (${conversiones} con reseña).`
  );
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
