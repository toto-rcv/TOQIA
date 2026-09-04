import { SelectorIdioma } from "@/components/landing/selector-idioma";
import { PanelNav, type NavItem } from "@/components/layout/panel-nav";

/**
 * Estructura común de los tres paneles internos.
 *
 * Tres formas según el ancho, no una sola comprimida:
 *
 *  - **Escritorio (≥1024px)**: barra lateral fija de 244px con las secciones
 *    en vertical. Es la forma que tolera crecer — cuando la etapa B agregue
 *    stock, distribuidores y comisiones, entran como ítems nuevos sin pelear
 *    por el ancho de una barra horizontal.
 *  - **Tablet (≥640px)**: la lateral se colapsa a íconos; el nombre de cada
 *    sección aparece al pasar el mouse.
 *  - **Celular**: barra inferior fija con las cinco secciones principales y
 *    el resto en un cajón. El pulgar llega a la parte de abajo de la
 *    pantalla; a la de arriba, no.
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
      <PanelNav
        title={title}
        badge={badge}
        email={email}
        items={items}
        selectorIdioma={<SelectorIdioma volverA="/empresa" tono="carta" align="left" />}
      />

      {/* pl en escritorio deja lugar a la lateral fija; pb en celular, a la
          barra inferior, para que el último botón de la página no quede
          tapado. */}
      <div className="lg:pl-[244px] sm:pl-[68px]">
        <main className="mx-auto max-w-[1240px] px-4 pb-28 pt-4 sm:px-6 sm:pb-10 sm:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export type { NavItem };
