import type { Period } from "@/lib/time";
import { formatDate } from "@/lib/utils";

/**
 * Cómo se llama un período en el idioma del pedido.
 *
 * `lib/time.ts` arma los períodos sin saber nada de idiomas: guarda la clave
 * (`label30d`, `elDia`, `delAl`) y, para un rango a medida, los dos días en
 * crudo. Acá se junta con las traducciones y con el formato de fecha del
 * idioma activo, que es lo que hace que un 4 de septiembre se lea 04/09/2026
 * en castellano y 04.09.2026 en alemán.
 */
export function etiquetaDePeriodo(
  t: (clave: string, valores?: Record<string, string>) => string,
  period: Period,
  locale: string
): string {
  if (!period.labelDates) return t(period.labelKey);

  const { desde, hasta } = period.labelDates;
  const desdeTexto = formatDate(desde, locale);
  const hastaTexto = formatDate(hasta, locale);

  return desde === hasta
    ? t("elDia", { fecha: desdeTexto })
    : t("delAl", { desde: desdeTexto, hasta: hastaTexto });
}
