import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { LandingView } from "@/components/landing/landing-view";
import {
  getBraceletCodesOfLocation,
  getLocationById,
  getLocationForAccount,
} from "@/db/queries/locations";
import { hasVisibleMenu } from "@/db/queries/menu";
import { requireUser } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("VistaPrevia");
  return { title: t("titulo"), robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

/**
 * Vista previa de la página pública.
 *
 * Vive fuera de /panel a propósito: si estuviera adentro, el layout del panel
 * le pondría la barra oscura arriba y no se vería como la ve el cliente.
 *
 * No registra ningún escaneo y el token va en null, así que el clic al botón
 * de reseña no ensucia las estadísticas del local.
 */
export default async function VistaPreviaPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const [user, { local }, t] = await Promise.all([
    requireUser(),
    searchParams,
    getTranslations("VistaPrevia"),
  ]);

  const locationId = local ? Number.parseInt(local, 10) : NaN;
  if (!Number.isFinite(locationId)) notFound();

  // El admin puede previsualizar cualquiera; un restaurante, solo los suyos.
  const location =
    user.role === "admin"
      ? await getLocationById(locationId)
      : user.accountId !== null
        ? await getLocationForAccount(locationId, user.accountId)
        : null;

  if (!location) notFound();

  // Para que el botón "Ver menú" se comporte igual que en la página real:
  // hace falta saber si hay platos cargados y con qué pulsera armar el link
  // a la carta. Cualquiera de las del local sirve.
  const [tieneCarta, codigos] = await Promise.all([
    hasVisibleMenu(location.id),
    getBraceletCodesOfLocation(location.id),
  ]);

  return (
    <>
      <div className="bg-ex-blue-deep px-4 py-2 text-center text-xs text-white">
        {t("aviso")}
      </div>
      <LandingView
        landing={location}
        token={null}
        code={codigos[0]}
        hasMenu={tieneCarta}
        /* El selector también acá: es la forma que tiene el local de ver cómo
           le queda su página en cada idioma antes de que la vea un cliente. */
        volverA={`/vista-previa?local=${location.id}`}
      />
    </>
  );
}
