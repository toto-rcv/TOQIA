import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { LandingView } from "@/components/landing/landing-view";
import { hasVisibleMenu } from "@/db/queries/menu";
import { hashIp } from "@/lib/hash";
import { getClientIp } from "@/lib/request-ip";
import {
  destinoDeCodigoNoResuelto,
  normalizeCode,
  resolverPulsera,
} from "@/lib/resolver-pulsera";
import { idiomaActual } from "@/i18n/actual";
import { PARAM_CAMBIO_DE_IDIOMA } from "@/i18n/locales";
import { recordScan } from "@/lib/scan-logger";
import { landingTraducida } from "@/lib/traduccion/contenido";
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
  const normalizado = normalizeCode(code);
  const resolucion = normalizado
    ? await resolverPulsera(normalizado, "landing")
    : ({ estado: "no-existe" } as const);

  const landing = resolucion.estado === "ok" ? resolucion.datos.landing : null;
  const nombre = landing?.displayName || landing?.name;
  const t = await getTranslations("Landing");

  return {
    // `absolute` esquiva el template del layout raíz: esta pestaña es del
    // restaurante, no de Toqia.
    title: { absolute: nombre ?? "Toqia" },
    description: nombre ? t("descripcion", { nombre }) : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ code: rawCode }, query] = await Promise.all([params, searchParams]);
  const code = normalizeCode(rawCode);

  if (!code) redirect("/pulsera/no-reconocida");

  const resolucion = await resolverPulsera(code, "landing");
  if (resolucion.estado !== "ok") {
    redirect(await destinoDeCodigoNoResuelto(code, resolucion.estado));
  }
  const resolved = resolucion.datos;

  // La cuenta manda sobre todo lo demás: si está dada de baja o cancelada, no
  // importa el estado del local ni el de la pulsera.
  const cuentaHabilitada =
    resolved.accountActive && resolved.subscriptionStatus !== "cancelled";

  if (!cuentaHabilitada || !resolved.locationActive || !resolved.braceletActive) {
    redirect(`/pulsera/inactiva?c=${encodeURIComponent(code)}`);
  }

  const vueltaDelSelector = query[PARAM_CAMBIO_DE_IDIOMA] === "1";

  const requestHeaders = await headers();
  const token = vueltaDelSelector
    ? null
    : await recordScan({
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

  // Si el local cargó carta propia, el botón del menú va a la carta de Toqia
  // en vez de al PDF externo. Se consulta acá y no dentro del componente para
  // que el render no dispare una query por su cuenta.
  // Y en paralelo, los textos del local en el idioma de quien escanea. La
  // consulta es por índice y sobre un solo id; lo caro de traducir ya se hizo
  // en el panel, al guardar.
  const [conCarta, landing] = await Promise.all([
    hasVisibleMenu(resolved.locationId),
    landingTraducida(resolved.locationId, resolved.landing, await idiomaActual()),
  ]);

  const rutaPropia = `/r/${encodeURIComponent(code)}`;

  return (
    <LandingView
      landing={landing}
      token={token}
      code={code}
      hasMenu={conCarta}
      volverA={`${rutaPropia}?${PARAM_CAMBIO_DE_IDIOMA}=1`}
    />
  );
}
