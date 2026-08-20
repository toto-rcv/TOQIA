"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; exact?: boolean };

/**
 * Navegación de sección. La usan /admin, /panel y /distribuidor.
 *
 * La marca del ítem activo es un `border-bottom` del propio enlace, que ocupa
 * todo el alto de la barra. Antes era un `<span>` posicionado por fuera del
 * contenedor: eso hacía que el contenido midiera más que la barra y el
 * navegador agregara scroll vertical, así que la nav "subía y bajaba" con la
 * rueda del mouse. Sin elementos que se salgan de la caja, no hay scroll que
 * arreglar.
 */
export function SectionNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="ex-nav-scroll flex h-full min-w-0 flex-1 items-stretch gap-1
                 overflow-x-auto overflow-y-hidden"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center whitespace-nowrap border-b-2 px-2.5 text-[13px]",
              "transition-colors duration-150",
              active
                ? // El azul eléctrico marca el estado activo y nada más.
                  "border-ex-blue text-ex-text"
                : "border-transparent text-ex-text-muted hover:text-ex-text-secondary"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
