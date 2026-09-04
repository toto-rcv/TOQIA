import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { listLocations } from "@/db/queries/locations";
import { getMenu } from "@/db/queries/menu";
import { requireRestaurantUser } from "@/lib/session";
import { LocationPicker } from "../configuracion/location-picker";
import { MenuEditor, NewCategoryDialog } from "./menu-editor";
import { MenuHeaderCard } from "./menu-header-card";
import { db, locations as locationsTable } from "@/db";
import { eq } from "drizzle-orm";

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("CartaAdmin");
  return { title: t("titulo") };
}
export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";

export default async function CartaPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const [user, t] = await Promise.all([
    requireRestaurantUser(),
    getTranslations("CartaAdmin"),
  ]);
  const { local } = await searchParams;

  const misLocales = await listLocations({ accountId: user.accountId });

  if (misLocales.length === 0) {
    return (
      <>
        <PageHeader title={t("titulo")} />
        <Card>
          <EmptyState>
            {t("sinLocales")}
          </EmptyState>
        </Card>
      </>
    );
  }

  // El id del filtro tiene que ser de esta cuenta; si no, se cae al primero.
  const pedido = local ? Number.parseInt(local, 10) : NaN;
  const elegido = misLocales.find((item) => item.id === pedido) ?? misLocales[0];

  const [categorias, filas] = await Promise.all([
    getMenu(elegido.id),
    db
      .select({
        currency: locationsTable.currency,
        menuHeaderImageUrl: locationsTable.menuHeaderImageUrl,
      })
      .from(locationsTable)
      .where(eq(locationsTable.id, elegido.id))
      .limit(1),
  ]);

  const currency = filas[0]?.currency ?? "€";
  const cabecera = filas[0]?.menuHeaderImageUrl ?? null;

  const platos = categorias.reduce(
    (total, categoria) => total + categoria.items.length,
    0
  );

  const catLabel = categorias.length === 1 ? t("categoriaSingular") : t("categoriaPlural");
  const platoLabel = platos === 1 ? t("platoSingular") : t("platoPlural");

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={
          platos === 0
            ? t("subtituloVacia")
            : t("subtituloResumen", {
                categorias: categorias.length,
                catLabel,
                platos,
                platoLabel,
              })
        }
      >
        {categorias.length > 0 ? <NewCategoryDialog locationId={elegido.id} /> : null}
      </PageHeader>

      {misLocales.length > 1 ? (
        <LocationPicker
          locations={misLocales.map((item) => ({ id: item.id, name: item.name }))}
          current={elegido.id}
          basePath="/panel/carta"
        />
      ) : null}

      <MenuHeaderCard
        key={`cabecera-${elegido.id}`}
        locationId={elegido.id}
        actual={cabecera}
      />

      <MenuEditor
        key={elegido.id}
        locationId={elegido.id}
        currency={currency}
        categories={categorias}
      />
    </>
  );
}
