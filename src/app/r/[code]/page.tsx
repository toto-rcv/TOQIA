import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LandingView } from "@/components/landing/landing-view";
import { resolveBraceletByCode, type ResolvedBracelet } from "@/db/queries/landing";
import { hashIp } from "@/lib/hash";
import { getCached, setCached } from "@/lib/redirect-cache";
import { getClientIp } from "@/lib/request-ip";
import { recordScan } from "@/lib/scan-logger";
import { safeUrl } from "@/lib/url";

/**
 * La landing pública del local — lo que ve el cliente al apoyar el celular.
 *
 * Secuencia:
 *   1. Resolver el código contra el caché en memoria.
 *   2. Si es un caso borde, mandar a la página correspondiente.
 *   3. Registrar el escaneo (deduplicando recargas) y quedarse con el token,
 *      que es lo que después permite atribuir el clic a Google.
 *   4. Si la pulsera tiene override, redirigir; si no, renderizar la landing.
 *
 * El registro va antes del render y no después: como ya estamos armando una
 * página, escribir acá elimina la carrera en la que el clic a Google llegaba
 * antes de que existiera el escaneo al que atribuirlo.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const resolved = await resolveCached(normalizeCode(code));
  const nombre = resolved?.landing.displayName || resolved?.landing.name;

  return {
    title: nombre ?? "Toqia",
    description: nombre ? `Dejanos tu opinión sobre ${nombre}.` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);

  if (!code) redirect("/pulsera/no-reconocida");

  const resolved = await resolveCached(code);
  if (!resolved) redirect(`/pulsera/no-reconocida?c=${encodeURIComponent(code)}`);

  // La cuenta manda sobre todo lo demás: si está dada de baja o cancelada, no
  // importa el estado del local ni el de la pulsera.
  const cuentaHabilitada =
    resolved.accountActive && resolved.subscriptionStatus !== "cancelled";

  if (!cuentaHabilitada || !resolved.locationActive || !resolved.braceletActive) {
    redirect(`/pulsera/inactiva?c=${encodeURIComponent(code)}`);
  }

  const requestHeaders = await headers();
  const token = await recordScan({
    braceletId: resolved.braceletId,
    locationId: resolved.locationId,
    accountId: resolved.accountId,
    waiterId: resolved.waiterId,
    userAgent: requestHeaders.get("user-agent"),
    ipHash: hashIp(getClientIp(requestHeaders)),
  });

  // Excepción configurable: esta pulsera saltea la landing y va derecho a otro
  // lado. El escaneo ya quedó registrado.
  const override = safeUrl(resolved.overrideUrl);
  if (override) redirect(override);

  return <LandingView landing={resolved.landing} token={token} />;
}

/** Resuelve el código usando el caché en memoria. */
async function resolveCached(
  code: string | null
): Promise<ResolvedBracelet | null> {
  if (!code) return null;

  const cached = getCached(code);
  if (cached !== undefined) return cached;

  try {
    const resolved = await resolveBraceletByCode(code);
    setCached(code, resolved);
    return resolved;
  } catch (error) {
    // Sin base no podemos resolver nada. No cacheamos el fallo: la próxima
    // vuelve a intentar.
    console.error("[landing] falló la resolución de la pulsera", {
      code,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Toleramos que el código llegue con espacios o url-encodeado, pero se compara
 * tal cual está en la base.
 */
function normalizeCode(raw: string | undefined): string | null {
  if (!raw) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Un % suelto rompe decodeURIComponent; seguimos con el valor original.
  }

  const trimmed = decoded.trim();
  // Límite defensivo: la columna es varchar(50).
  if (trimmed === "" || trimmed.length > 50) return null;
  return trimmed;
}
