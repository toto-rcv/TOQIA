import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MenuView } from "@/components/landing/menu-view";

import { getLocationById } from "@/db/queries/locations";
import { getMenu } from "@/db/queries/menu";
import {
  destinoDeCodigoNoResuelto,
  normalizeCode,
  resolverPulsera,
} from "@/lib/resolver-pulsera";

/**
 * La carta del local — `/r/B001/carta`.
 *
 * Cuelga del código de la pulsera y no del slug del local a propósito: así el
 * botón "Volver" sabe a qué página de escaneo regresar, y la URL sigue siendo
 * la misma familia que el cliente ya tiene abierta.
 *
 * No registra escaneo: el escaneo ya se registró al abrir la landing. Entrar
 * a ver la carta no es un escaneo nuevo.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const normalizado = normalizeCode(code);
  const resolucion = normalizado
    ? await resolverPulsera(normalizado, "carta")
    : ({ estado: "no-existe" } as const);

  const landing = resolucion.estado === "ok" ? resolucion.datos.landing : null;
  const nombre = landing?.displayName || landing?.name;

  const t = await getTranslations("Carta");
  const titulo = t("titulo");

  return {
    title: { absolute: nombre ? `${titulo} · ${nombre}` : titulo },
    robots: { index: false, follow: false },
  };
}

export default async function CartaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);

  if (!code) redirect("/pulsera/no-reconocida");

  const resolucion = await resolverPulsera(code, "carta");
  if (resolucion.estado !== "ok") {
    redirect(await destinoDeCodigoNoResuelto(code, resolucion.estado));
  }
  const resolved = resolucion.datos;

  const cuentaHabilitada =
    resolved.accountActive && resolved.subscriptionStatus !== "cancelled";

  if (!cuentaHabilitada || !resolved.locationActive || !resolved.braceletActive) {
    redirect(`/pulsera/inactiva?c=${encodeURIComponent(code)}`);
  }

  // La moneda no viaja en el caché de la landing, así que se lee del local.
  const [categorias, local] = await Promise.all([
    getMenu(resolved.locationId, { soloVisibles: true }),
    getLocationById(resolved.locationId),
  ]);

  const rutaPropia = `/r/${encodeURIComponent(code)}/carta`;

  return (
    <MenuView
      landing={resolved.landing}
      categories={categorias}
      currency={local?.currency ?? "€"}
      backHref={`/r/${encodeURIComponent(code)}`}
      /* La carta no registra escaneos, así que volver acá después de cambiar
         de idioma no ensucia ninguna métrica: no necesita el parámetro que sí
         lleva la landing. */
      volverA={rutaPropia}
    />
  );
}
