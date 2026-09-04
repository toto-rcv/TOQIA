import Link from "next/link";
import { Eye } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { listLocations } from "@/db/queries/locations";
import { hasVisibleMenu } from "@/db/queries/menu";
import { requireRestaurantUser } from "@/lib/session";
import { LandingForm } from "./landing-form";
import { LocationPicker } from "./location-picker";
import { db, locations as locationsTable } from "@/db";
import { eq } from "drizzle-orm";

export const metadata = { title: "Mi página · Toqia" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage({
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
        <PageHeader title="Mi página" />
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
  const elegido =
    misLocales.find((item) => item.id === pedido) ?? misLocales[0];

  // Traemos la fila completa: el listado no incluye los campos de branding.
  const filas = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, elegido.id))
    .limit(1);

  const location = filas[0];
  if (!location) {
    return (
      <>
        <PageHeader title="Mi página" />
        <Card>
          <EmptyState>No se encontró el local.</EmptyState>
        </Card>
      </>
    );
  }

  // Para avisarle si eligió la carta de Toqia pero todavía no cargó platos.
  const tieneCartaToqia = await hasVisibleMenu(location.id);

  return (
    <>
      <PageHeader
        title="Mi página"
        subtitle="Esto es lo que ve el cliente cuando apoya el celular en una pulsera."
      >
        <Link
          href={`/vista-previa?local=${location.id}`}
          target="_blank"
          className="ex-btn-ghost"
        >
          <Eye className="size-4" />
          Ver cómo queda
        </Link>
      </PageHeader>

      {misLocales.length > 1 ? (
        <LocationPicker
          locations={misLocales.map((item) => ({ id: item.id, name: item.name }))}
          current={location.id}
        />
      ) : null}

      {/* Sin tarjeta contenedora: cada sección del formulario ya es una.
          key fuerza a React a rearmar el formulario al cambiar de local: si no,
          los defaultValue del local anterior quedarían pegados. */}
      <LandingForm
        key={location.id}
        location={location}
        tieneCartaToqia={tieneCartaToqia}
      />
    </>
  );
}
