import { notFound } from "next/navigation";

import { LandingView } from "@/components/landing/landing-view";
import { getLocationById, getLocationForAccount } from "@/db/queries/locations";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Vista previa · Toqia",
  robots: { index: false, follow: false },
};
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
  const user = await requireUser();
  const { local } = await searchParams;

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

  return (
    <>
      <div className="bg-ex-blue-deep px-4 py-2 text-center text-xs text-white">
        Vista previa · los clics de esta pantalla no se registran
      </div>
      <LandingView landing={location} token={null} />
    </>
  );
}
