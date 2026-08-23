/**
 * Paginación del lado del servidor.
 *
 * La regla es una sola: **la base nunca devuelve más filas de las que se van a
 * mostrar**. Una cuenta con 50.000 pulseras tiene que costar lo mismo que una
 * con 10, y eso solo se logra si el LIMIT viaja hasta el SQL.
 *
 * Los listados devuelven `Paged<T>`, que además del pedazo de datos trae lo
 * necesario para dibujar el paginador sin tener que contar en el cliente.
 */

export const DEFAULT_PAGE_SIZE = 10;

/** Tope duro. Sin esto, `?limit=1000000` sería un DoS de una línea. */
export const MAX_PAGE_SIZE = 100;

export type PageParams = { page: number; limit: number };

export type Paged<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** Lo que llega por query string, ya sea de la URL o de un fetch a la API. */
export type RawPageParams = {
  page?: string | string[];
  limit?: string | string[];
};

function primerValor(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Lee `?page=1&limit=10` con valores seguros por defecto.
 * Cualquier cosa rara (texto, negativos, cero) cae en la primera página con el
 * tamaño estándar: es mejor mostrar algo correcto que un error.
 */
export function parsePageParams(
  raw: RawPageParams,
  defaultLimit = DEFAULT_PAGE_SIZE
): PageParams {
  const page = Number.parseInt(primerValor(raw.page) ?? "", 10);
  const limit = Number.parseInt(primerValor(raw.limit) ?? "", 10);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit:
      Number.isFinite(limit) && limit > 0
        ? Math.min(limit, MAX_PAGE_SIZE)
        : defaultLimit,
  };
}

/** OFFSET para el SQL. */
export function offsetOf({ page, limit }: PageParams): number {
  return (page - 1) * limit;
}

/**
 * Arma la respuesta paginada.
 *
 * Si el total bajó mientras el usuario estaba en la última página (alguien
 * borró filas), `page` se recorta a la última existente en vez de devolver un
 * paginador que apunta al vacío.
 */
export function buildPaged<T>(
  data: T[],
  total: number,
  params: PageParams
): Paged<T> {
  const totalPages = Math.max(1, Math.ceil(total / params.limit));

  return {
    data,
    page: Math.min(params.page, totalPages),
    limit: params.limit,
    total,
    totalPages,
  };
}

/** Página vacía, para cuando ni hace falta consultar (cuenta sin locales). */
export function emptyPage<T>(params: PageParams): Paged<T> {
  return { data: [], page: 1, limit: params.limit, total: 0, totalPages: 1 };
}
