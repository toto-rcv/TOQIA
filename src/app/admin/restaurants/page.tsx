import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listRestaurants } from "@/db/queries/restaurants";
import { formatDate, formatNumber } from "@/lib/utils";
import { NewRestaurantDialog, RestaurantRowActions } from "./restaurant-dialogs";

export const metadata = { title: "Restaurantes · Panel" };
export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const restaurants = await listRestaurants();

  return (
    <>
      <PageHeader
        title="Restaurantes"
        subtitle="Desactivar un restaurante corta la redirección de todas sus pulseras."
      >
        <NewRestaurantDialog />
      </PageHeader>

      {restaurants.length === 0 ? (
        <Card>
          <EmptyState>
            Todavía no hay restaurantes cargados.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Nombre</Th>
                <Th className="w-[200px]">Slug</Th>
                <Th className="w-[110px] text-right">Pulseras</Th>
                <Th className="w-[110px] text-right">Escaneos</Th>
                <Th className="w-[120px]">Alta</Th>
                <Th className="w-[100px]">Estado</Th>
                <Th className="w-[90px] text-right">Acciones</Th>
              </tr>
            </Thead>
            <tbody>
              {restaurants.map((restaurant) => (
                <Tr key={restaurant.id} className={restaurant.active ? undefined : "opacity-60"}>
                  <Td>
                    <Link
                      href={`/admin/restaurants/${restaurant.id}`}
                      className="text-sm text-ex-text transition-colors hover:text-ex-blue-bright"
                    >
                      {restaurant.name}
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs">{restaurant.slug}</Td>
                  <Td className="num text-right text-sm text-ex-text">
                    {formatNumber(restaurant.braceletCount)}
                  </Td>
                  <Td className="num text-right text-sm text-ex-text">
                    {formatNumber(restaurant.scanCount)}
                  </Td>
                  <Td className="num text-[11px]">{formatDate(restaurant.createdAt)}</Td>
                  <Td>
                    <Badge tone={restaurant.active ? "active" : "inactive"}>
                      {restaurant.active ? "activo" : "inactivo"}
                    </Badge>
                  </Td>
                  <Td>
                    <RestaurantRowActions restaurant={restaurant} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
