import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha guardada en UTC a la hora local del navegador/servidor.
 * TODAS las fechas se guardan en UTC; la conversión pasa solo acá, al render.
 *
 * El `locale` viene de quien renderiza —`getLocale()` en el servidor,
 * `useLocale()` en el cliente— porque el panel está en siete idiomas y una
 * fecha escrita 04/09/2026 a un alemán le dice otra cosa que 04.09.2026.
 * Queda con valor por defecto para que un llamado suelto no rompa.
 */
export function formatDateTime(
  value: Date | string | null | undefined,
  locale = "es"
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(
  value: Date | string | null | undefined,
  locale = "es"
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatNumber(value: number, locale = "es"): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Arma la URL completa que se graba en el chip NFC.
 * Se toma de NEXT_PUBLIC_APP_URL para que en desarrollo se pueda apuntar a la
 * IP de la LAN y probar con el celular de verdad.
 */
export function braceletUrl(code: string): string {
  return `${sitioUrl()}/r/${code}`;
}

/**
 * La URL pública del sitio, sin barra final.
 *
 * La usan `braceletUrl`, el sitemap y el `metadataBase` del layout. Que salga
 * de un solo lugar evita que el chip se grabe apuntando a un dominio y el
 * canonical declare otro.
 */
export function sitioUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}
