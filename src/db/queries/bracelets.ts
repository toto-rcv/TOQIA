import { and, asc, eq, isNotNull, isNull, sql, type SQL } from "drizzle-orm";

import { accounts, bracelets, db, locations, scans, user, waiters } from "@/db";
import {
  buildPaged,
  offsetOf,
  type PageParams,
  type Paged,
} from "@/lib/pagination";

export type BraceletListItem = {
  id: number;
  code: string;
  deviceType: string;
  label: string | null;
  overrideUrl: string | null;
  active: boolean;
  /** Null = la pulsera todavía no está puesta en ningún local (stock). */
  locationId: number | null;
  locationName: string | null;
  locationActive: boolean | null;
  accountId: number | null;
  accountName: string | null;
  accountActive: boolean | null;
  /** Distribuidor que la tiene o que la colocó. */
  distributorId: string | null;
  distributorName: string | null;
  waiterId: number | null;
  waiterName: string | null;
  scanCount: number;
  reviewClicks: number;
  lastScanAt: Date | null;
  createdAt: Date;
};

export type BraceletFilters = {
  accountId?: number;
  locationId?: number;
  waiterId?: number;
  /** Pulseras entregadas a este distribuidor, estén o no puestas en un local. */
  distributorId?: string;
  /**
   * true  → solo las que todavía no están en ningún local (stock)
   * false → solo las que ya están puestas
   */
  sinLocal?: boolean;
};

function condicionesDe(options: BraceletFilters): SQL[] {
  const condiciones: SQL[] = [];
  if (options.accountId) condiciones.push(eq(locations.accountId, options.accountId));
  if (options.locationId) condiciones.push(eq(bracelets.locationId, options.locationId));
  if (options.waiterId) condiciones.push(eq(bracelets.waiterId, options.waiterId));
  if (options.distributorId) {
    condiciones.push(eq(bracelets.distributorId, options.distributorId));
  }
  if (options.sinLocal === true) condiciones.push(isNull(bracelets.locationId));
  if (options.sinLocal === false) condiciones.push(isNotNull(bracelets.locationId));
  return condiciones;
}

/**
 * Una página de pulseras con sus agregados.
 *
 * El LIMIT/OFFSET va en el SQL: la base devuelve exactamente las filas que se
 * van a dibujar, no todas las de la cuenta. El COUNT viaja en paralelo, sobre
 * la misma condición pero sin los joins de presentación ni las subconsultas de
 * agregado, que son lo caro.
 *
 * Los conteos van por subconsulta y no por LEFT JOIN + GROUP BY: agrupar
 * obligaría a incluir todas las columnas de bracelets en el GROUP BY y MySQL
 * terminaría materializando una temporal más grande de lo necesario. Con
 * LIMIT 10 esas subconsultas corren diez veces, no una por cada fila de la
 * tabla.
 */
export async function listBracelets(
  options: BraceletFilters,
  pagination: PageParams
): Promise<Paged<BraceletListItem>> {
  const condiciones = condicionesDe(options);
  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [filas, totales] = await Promise.all([
    db
      .select({
      id: bracelets.id,
      code: bracelets.code,
      deviceType: bracelets.deviceType,
      label: bracelets.label,
      overrideUrl: bracelets.overrideUrl,
      active: bracelets.active,
      locationId: bracelets.locationId,
      locationName: locations.name,
      locationActive: locations.active,
      accountId: locations.accountId,
      accountName: accounts.name,
      accountActive: accounts.active,
      distributorId: bracelets.distributorId,
      distributorName: user.name,
      waiterId: bracelets.waiterId,
      waiterName: waiters.name,
      createdAt: bracelets.createdAt,
      scanCount: sql<number>`(
        SELECT COUNT(*) FROM ${scans} WHERE ${scans.braceletId} = ${bracelets.id}
      )`.mapWith(Number),
      reviewClicks: sql<number>`(
        SELECT COUNT(${scans.reviewClickedAt}) FROM ${scans}
        WHERE ${scans.braceletId} = ${bracelets.id}
      )`.mapWith(Number),
      lastScanAt: sql<Date | null>`(
        SELECT MAX(${scans.scannedAt}) FROM ${scans}
        WHERE ${scans.braceletId} = ${bracelets.id}
      )`,
    })
      .from(bracelets)
      // LEFT y no INNER: una pulsera en stock todavía no tiene local, y con un
      // INNER JOIN desaparecería de la lista en vez de mostrarse como stock.
      .leftJoin(locations, eq(bracelets.locationId, locations.id))
      .leftJoin(accounts, eq(locations.accountId, accounts.id))
      .leftJoin(waiters, eq(bracelets.waiterId, waiters.id))
      .leftJoin(user, eq(bracelets.distributorId, user.id))
      .where(where)
      // El id desempata: sin un orden total, dos filas con el mismo código
      // podrían aparecer en dos páginas distintas o en ninguna.
      .orderBy(accounts.name, locations.name, bracelets.code, bracelets.id)
      .limit(pagination.limit)
      .offset(offsetOf(pagination)),

    db
      .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(bracelets)
      .leftJoin(locations, eq(bracelets.locationId, locations.id))
      .where(where),
  ]);

  const data = filas.map((fila) => ({
    ...fila,
    waiterName: fila.waiterName ?? null,
    distributorName: fila.distributorName ?? null,
    lastScanAt: fila.lastScanAt ? new Date(fila.lastScanAt) : null,
  }));

  return buildPaged(data, totales[0]?.total ?? 0, pagination);
}

/**
 * Solo id, código y local: lo que necesita un `<select>` de filtro.
 *
 * Existe para no usar `listBracelets` en los desplegables. Esa consulta trae
 * tres subconsultas de agregado por fila; para llenar un combo alcanza con
 * dos columnas.
 */
export async function listBraceletOptions(options: BraceletFilters) {
  const condiciones = condicionesDe(options);
  // Solo las que ya están puestas en un local: este listado alimenta el filtro
  // de la tabla de escaneos, y una pulsera en stock no tiene escaneos.
  condiciones.push(isNotNull(bracelets.locationId));

  const filas = await db
    .select({
      id: bracelets.id,
      code: bracelets.code,
      locationId: bracelets.locationId,
    })
    .from(bracelets)
    .leftJoin(locations, eq(bracelets.locationId, locations.id))
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(asc(bracelets.code))
    // Un combo con más de dos mil opciones ya no es usable; el tope evita que
    // una cuenta enorme cuelgue la página del filtro.
    .limit(2000);

  // El `isNotNull` de arriba ya las descartó; esto es para que el tipo lo
  // refleje, sin un `!` que mienta si mañana cambia la condición.
  return filas.flatMap((fila) =>
    fila.locationId === null
      ? []
      : [{ id: fila.id, code: fila.code, locationId: fila.locationId }]
  );
}

export async function getBraceletById(id: number) {
  const filas = await db.select().from(bracelets).where(eq(bracelets.id, id)).limit(1);
  return filas[0] ?? null;
}

export async function getBraceletByCode(code: string) {
  const filas = await db
    .select()
    .from(bracelets)
    .where(eq(bracelets.code, code))
    .limit(1);
  return filas[0] ?? null;
}

/**
 * Trae una pulsera verificando que pertenezca a la cuenta indicada.
 * La usan las acciones del panel del restaurante, que no pueden confiar en un
 * id que llegó por formulario.
 */
export async function getBraceletForAccount(id: number, accountId: number) {
  const filas = await db
    .select({
      id: bracelets.id,
      code: bracelets.code,
      locationId: bracelets.locationId,
      waiterId: bracelets.waiterId,
      label: bracelets.label,
      active: bracelets.active,
    })
    .from(bracelets)
    .innerJoin(locations, eq(bracelets.locationId, locations.id))
    .where(and(eq(bracelets.id, id), eq(locations.accountId, accountId)))
    .limit(1);
  return filas[0] ?? null;
}

/**
 * Códigos ya usados dentro de una lista.
 * El alta masiva la usa para saltear los existentes en vez de reventar con un
 * error de clave duplicada a mitad del lote.
 */
export async function findExistingCodes(codes: string[]): Promise<Set<string>> {
  if (codes.length === 0) return new Set();

  const filas = await db
    .select({ code: bracelets.code })
    .from(bracelets)
    .where(sql`${bracelets.code} IN ${codes}`);

  return new Set(filas.map((fila) => fila.code));
}

export type StockPulseras = {
  /** Entregadas al distribuidor, en total. */
  total: number;
  /** Todavía sin local: las que tiene para colocar. */
  enStock: number;
  /** Ya puestas en un local. */
  colocadas: number;
};

/**
 * Inventario de un distribuidor en una sola consulta.
 *
 * Va con COUNT condicional en vez de tres consultas: es la misma pasada por el
 * índice `bracelets_distributor_idx` y no tres.
 */
export async function getStockDeDistribuidor(
  distributorId: string
): Promise<StockPulseras> {
  const filas = await db
    .select({
      total: sql<number>`COUNT(*)`.mapWith(Number),
      enStock: sql<number>`SUM(${bracelets.locationId} IS NULL)`.mapWith(Number),
    })
    .from(bracelets)
    .where(eq(bracelets.distributorId, distributorId));

  const total = filas[0]?.total ?? 0;
  // SUM sobre cero filas devuelve NULL, no 0.
  const enStock = Number(filas[0]?.enStock ?? 0) || 0;

  return { total, enStock, colocadas: total - enStock };
}

/**
 * Trae una pulsera verificando que sea de este distribuidor.
 * La usan las acciones del panel del distribuidor, que no pueden confiar en un
 * id que llegó por formulario.
 */
export async function getBraceletForDistributor(id: number, distributorId: string) {
  const filas = await db
    .select({
      id: bracelets.id,
      code: bracelets.code,
      locationId: bracelets.locationId,
      active: bracelets.active,
    })
    .from(bracelets)
    .where(and(eq(bracelets.id, id), eq(bracelets.distributorId, distributorId)))
    .limit(1);
  return filas[0] ?? null;
}
