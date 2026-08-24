import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MenuView } from "@/components/landing/menu-view";
import { resolveBraceletByCode } from "@/db/queries/landing";
import { getLocationById } from "@/db/queries/locations";
import { getMenu } from "@/db/queries/menu";
import { destinoDeCodigoSinLocal } from "@/lib/pulsera-sin-local";
import { getCached, setCached } from "@/lib/redirect-cache";

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
  const resolved = await resolver(code);
  const nombre = resolved?.landing.displayName || resolved?.landing.name;

  return {
    title: nombre ? `Carta · ${nombre}` : "Carta",
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

  const resolved = await resolver(code);
  if (!resolved) redirect(await destinoDeCodigoSinLocal(code));

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

  return (
    <MenuView
      landing={resolved.landing}
      categories={categorias}
      currency={local?.currency ?? "€"}
      backHref={`/r/${encodeURIComponent(code)}`}
    />
  );
}

/** Misma resolución que la landing, con el mismo caché en memoria. */
async function resolver(rawCode: string) {
  const code = normalizeCode(rawCode);
  if (!code) return null;

  const cached = getCached(code);
  if (cached !== undefined) return cached;

  try {
    const resolved = await resolveBraceletByCode(code);
    setCached(code, resolved);
    return resolved;
  } catch (error) {
    console.error("[carta] falló la resolución de la pulsera", {
      code,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function normalizeCode(raw: string | undefined): string | null {
  if (!raw) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Un % suelto rompe decodeURIComponent; seguimos con el valor original.
  }

  const trimmed = decoded.trim();
  if (trimmed === "" || trimmed.length > 50) return null;
  return trimmed;
}
