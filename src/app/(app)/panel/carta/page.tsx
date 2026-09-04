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

export const metadata = { title: "Mi carta · Toqia" };
export const dynamic = "force-dynamic";

export default async function CartaPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const user = await requireRestaurantUser();
  const { local } = await searchParams;

  const misLocales = await listLocations({ accountId: user.accountId });

  if (misLocales.length === 0) {
    return (
      <>
        <PageHeader title="Mi carta" />
        <Card>
          <EmptyState>
            Todavía no tenés locales cargados. Los da de alta el equipo de Toqia.
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

  return (
    <>
      <PageHeader
        title="Mi carta"
        subtitle={
          platos === 0
            ? "Cargá tu carta y el cliente la va a ver al escanear."
            : `${categorias.length} ${categorias.length === 1 ? "categoría" : "categorías"} · ${platos} ${platos === 1 ? "plato" : "platos"}. Los cambios se ven al instante.`
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
