import { SectionNav, type NavItem } from "@/components/layout/section-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";

/**
 * Estructura común de los tres paneles internos.
 * Cambian los ítems de navegación y la etiqueta; el resto es idéntico.
 */
export function PanelShell({
  title,
  badge,
  email,
  items,
  children,
}: {
  title: string;
  badge?: string;
  email: string;
  items: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="ex-scope min-h-dvh bg-ex-black text-ex-text">
      {/* h-[62px]: la barra tiene que dejar respirar a la navegación, que ocupa
          todo el alto para poder marcar el ítem activo con su propio borde. */}
      <header className="sticky top-0 z-40 border-b border-ex-border bg-ex-black/95 backdrop-blur">
        <div className="mx-auto flex h-[62px] max-w-[1400px] items-stretch gap-6 px-5">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ex-blue" aria-hidden />
            <span className="text-sm font-medium tracking-tight">{title}</span>
            {badge ? (
              <span className="rounded-control border border-ex-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ex-text-muted">
                {badge}
              </span>
            ) : null}
          </div>

          <SectionNav items={items} />

          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden font-mono text-[11px] text-ex-text-muted sm:inline">
              {email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">{children}</main>
    </div>
  );
}
