"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/bracelets", label: "Pulseras", exact: false },
  { href: "/admin/restaurants", label: "Restaurantes", exact: false },
  { href: "/admin/scans", label: "Escaneos", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-control px-2.5 py-1.5 text-[13px] transition-colors",
              active
                ? "text-ex-text"
                : "text-ex-text-muted hover:text-ex-text-secondary"
            )}
          >
            {item.label}
            {/* El azul eléctrico marca el estado activo y nada más. */}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-2.5 -bottom-[13px] h-px bg-ex-blue"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
