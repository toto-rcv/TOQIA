import {
  Beef,
  Beer,
  CakeSlice,
  ChefHat,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Dessert,
  Drumstick,
  EggFried,
  Fish,
  Flame,
  GlassWater,
  IceCreamCone,
  LeafyGreen,
  Martini,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

/**
 * El dibujo de cada ícono del catálogo (`lib/menu-icons.ts`).
 *
 * Casi todos salen de Lucide. Dos no existen ahí y están dibujados a mano con
 * el mismo lenguaje — cuadro de 24, trazo de 2, puntas redondeadas — para que
 * no se noten de otra familia al lado de los demás: la hamburguesa y la
 * empanada, que en una carta argentina no son un detalle menor.
 */

function Hamburguesa({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Pan de arriba, con su base recta */}
      <path d="M3.5 11.5a8.5 5.5 0 0 1 17 0Z" />
      {/* El relleno */}
      <path d="M4 14.6h16" />
      {/* Pan de abajo */}
      <path d="M4 17.3h16v.2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z" />
      {/* Semillas */}
      <path d="M8.6 8.9h.01M12 8.1h.01M15.4 8.9h.01" />
    </svg>
  );
}

function Empanada({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* La panza y el borde recto */}
      <path d="M3.5 16a8.5 7.5 0 0 1 17 0" />
      <path d="M3.5 16h17" />
      {/* El repulgue, colgando del borde: tres ondas alcanzan para que se lea
          como empanada y no como una cúpula, incluso a 18 píxeles. */}
      <path d="M5.6 16a1.4 1.4 0 0 0 2.8 0M10.6 16a1.4 1.4 0 0 0 2.8 0M15.6 16a1.4 1.4 0 0 0 2.8 0" />
    </svg>
  );
}

type Dibujo = LucideIcon | ((props: { className?: string }) => React.ReactElement);

const DIBUJOS: Record<string, Dibujo> = {
  hamburguesa: Hamburguesa,
  pizza: Pizza,
  carne: Beef,
  pollo: Drumstick,
  pescado: Fish,
  empanada: Empanada,
  sandwich: Sandwich,
  ensalada: Salad,
  sopa: Soup,
  pasta: CookingPot,
  desayuno: EggFried,
  panaderia: Croissant,
  vegetariano: LeafyGreen,
  parrilla: Flame,

  postre: Dessert,
  torta: CakeSlice,
  helado: IceCreamCone,
  galleta: Cookie,

  bebida: CupSoda,
  cafe: Coffee,
  cerveza: Beer,
  vino: Wine,
  coctel: Martini,
  agua: GlassWater,

  cubiertos: UtensilsCrossed,
  olla: Utensils,
  picada: ChefHat,
};

/**
 * Dibuja el ícono de una categoría. Si el id no está en el catálogo — porque
 * se sacó de la lista después de que alguien lo eligiera — no dibuja nada, en
 * vez de romper la página.
 */
export function MenuIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  if (!name) return null;

  const Dibujo = DIBUJOS[name];
  if (!Dibujo) return null;

  return <Dibujo className={className} />;
}

export function hasMenuIcon(name: string | null | undefined): boolean {
  return Boolean(name && DIBUJOS[name]);
}
