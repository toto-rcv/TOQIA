"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  Ellipsis,
  LayoutGrid,
  type LucideIcon,
  Nfc,
  ScanLine,
  Wrench,
  Store,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import * as React from "react";

import { SignOutButton } from "@/components/admin/sign-out-button";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  /** Nombre del ícono. Se resuelve acá para que el layout siga siendo server. */
  icon?: IconName;
};

/**
 * Los íconos se nombran con una cadena y no se pasan como componente porque
 * los layouts que arman el menú son Server Components, y una función no
 * atraviesa la frontera servidor→cliente.
 */
const ICONOS = {
  estadisticas: BarChart3,
  pulseras: Nfc,
  camareros: Users,
  escaneos: ScanLine,
  carta: UtensilsCrossed,
  pagina: Store,
  cuentas: Building2,
  locales: LayoutGrid,
  usuarios: UserRound,
  suscripciones: CreditCard,
  mantenimiento: Wrench,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONOS;

/** Cuántas secciones entran cómodas en la barra inferior del celular. */
const MAX_EN_BARRA = 4;

export function PanelNav({
  title,
  badge,
  email,
  items,
}: {
  title: string;
  badge?: string;
  email: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = React.useState(false);

  const esActivo = React.useCallback(
    (item: NavItem) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    [pathname]
  );

  // Al navegar, el cajón se cierra solo. Sin esto queda abierto tapando la
  // página a la que la persona acaba de entrar.
  React.useEffect(() => setMenuAbierto(false), [pathname]);

  const enBarra = items.slice(0, MAX_EN_BARRA);
  const enCajon = items.slice(MAX_EN_BARRA);
  const activoEnCajon = enCajon.some(esActivo);

  const seccionActual = items.find(esActivo)?.label ?? title;

  return (
    <>
      {/* ── Barra superior (solo celular) ──────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ex-border
                   bg-ex-surface/90 px-4 backdrop-blur sm:hidden"
      >
        <Marca title={title} badge={badge} compacta />
        <span className="ml-auto truncate text-sm font-semibold text-ex-text">
          {seccionActual}
        </span>
      </header>

      {/* ── Barra lateral (tablet y escritorio) ────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[68px] flex-col border-r border-ex-border
                   bg-ex-surface sm:flex lg:w-[244px]"
      >
        <div className="flex h-16 items-center border-b border-ex-border-subtle px-4 lg:px-5">
          <Marca title={title} badge={badge} />
        </div>

        <nav className="ex-nav-scroll flex-1 overflow-y-auto p-3 lg:p-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const activo = esActivo(item);
              const Icono = item.icon ? ICONOS[item.icon] : LayoutGrid;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={activo ? "page" : undefined}
                    title={item.label}
                    className={cn(
                      "ex-pill w-full justify-center lg:justify-start",
                      activo
                        ? "bg-ex-blue-wash text-ex-blue-deep"
                        : "text-ex-text-secondary hover:bg-ex-elevated hover:text-ex-text"
                    )}
                  >
                    <Icono className="size-[18px] shrink-0" aria-hidden />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-ex-border-subtle p-3 lg:p-4">
          <p className="mb-2 hidden truncate text-[11px] text-ex-text-muted lg:block">
            {email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Barra inferior (solo celular) ──────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ex-border bg-ex-surface/95
                   pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="Secciones"
      >
        <ul className="grid grid-cols-5">
          {enBarra.map((item) => (
            <li key={item.href}>
              <ItemDeBarra item={item} activo={esActivo(item)} />
            </li>
          ))}

          <li>
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-haspopup="dialog"
              aria-expanded={menuAbierto}
              className={cn(
                "flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium",
                activoEnCajon ? "text-ex-blue-deep" : "text-ex-text-muted"
              )}
            >
              <Ellipsis className="size-[22px]" aria-hidden />
              Más
            </button>
          </li>
        </ul>
      </nav>

      {/* ── Cajón con el resto de las secciones ────────────────────────── */}
      {menuAbierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Más secciones"
          className="fixed inset-0 z-50 sm:hidden"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setMenuAbierto(false)}
            className="absolute inset-0 bg-ex-text/35 backdrop-blur-[1px]"
          />

          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[22px] bg-ex-surface
                       pb-[max(1rem,env(safe-area-inset-bottom))] shadow-pop"
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <span className="text-sm font-semibold text-ex-text">
                Más secciones
              </span>
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar"
                className="-mr-2 rounded-control p-2 text-ex-text-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <ul className="px-3 pb-3">
              {enCajon.map((item) => {
                const activo = esActivo(item);
                const Icono = item.icon ? ICONOS[item.icon] : LayoutGrid;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "ex-pill w-full py-3",
                        activo
                          ? "bg-ex-blue-wash text-ex-blue-deep"
                          : "text-ex-text-secondary"
                      )}
                    >
                      <Icono className="size-[18px]" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-ex-border-subtle px-5 pt-3">
              <p className="mb-2 truncate text-[11px] text-ex-text-muted">{email}</p>
              <SignOutButton />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ItemDeBarra({ item, activo }: { item: NavItem; activo: boolean }) {
  const Icono = item.icon ? ICONOS[item.icon] : LayoutGrid;

  return (
    <Link
      href={item.href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        // py-2.5 + ícono de 22px da un área de toque de 48px de alto.
        "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium",
        activo ? "text-ex-blue-deep" : "text-ex-text-muted"
      )}
    >
      <Icono className="size-[22px]" aria-hidden />
      <span className="w-full truncate text-center">{item.label}</span>
    </Link>
  );
}

function Marca({
  title,
  badge,
  compacta = false,
}: {
  title: string;
  badge?: string;
  compacta?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-control bg-ex-blue
                   text-[13px] font-bold text-white"
      >
        T
      </span>

      <div className={cn("min-w-0", compacta ? "" : "hidden lg:block")}>
        <p className="truncate text-[13px] font-semibold leading-tight text-ex-text">
          {title}
        </p>
        {badge ? (
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-ex-text-muted">
            {badge}
          </p>
        ) : null}
      </div>
    </div>
  );
}
