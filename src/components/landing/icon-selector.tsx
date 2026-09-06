"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { MenuIcon } from "@/components/landing/menu-icons";
import { MENU_ICON_GROUPS } from "@/lib/menu-icons";
import { cn } from "@/lib/utils";

/**
 * Elegir un ícono del catálogo (`lib/menu-icons.ts`).
 *
 * Es una grilla de botones y no un desplegable a propósito: el ícono se elige
 * mirándolo. En una lista de nombres ("empanada", "picada") habría que
 * imaginarse cada uno.
 *
 * Lo que viaja al servidor es el id, en un input oculto. El servidor igual lo
 * valida contra el catálogo (`normalizeMenuIcon`): nunca se guarda lo que
 * llegó sin revisar.
 *
 * Es el mismo selector para las categorías de la carta y para el botón "Ver
 * menú" de la landing — antes cada uno tenía el suyo, y el del botón ni
 * siquiera existía: el ícono quedaba fijo en cubiertos cruzados sin que el
 * local pudiera cambiarlo. `ayudaElegido`/`ayudaVacio` son lo único que
 * cambia según quién lo usa, porque lo que significa "vacío" es distinto en
 * cada lado (sin ícono vs. el ícono de siempre).
 */
export function SelectorDeIcono({
  name,
  inicial,
  ayudaElegido,
  ayudaVacio,
}: {
  /** Nombre del input oculto que lleva el id elegido al formulario. */
  name: string;
  inicial?: string | null;
  ayudaElegido: string;
  ayudaVacio: string;
}) {
  const ti = useTranslations("Iconos");
  const [elegido, setElegido] = React.useState<string | null>(inicial ?? null);

  return (
    <div className="space-y-2">
      {/* No es un <label>: no hay un control único al que apuntar, son
          decenas de botones. El grupo se anuncia por el texto de arriba. */}
      <p className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-ex-text-muted">
        {ti("etiqueta")}{" "}
        <span className="normal-case text-ex-text-disabled">{ti("opcional")}</span>
      </p>

      <div className="max-h-[188px] space-y-3 overflow-y-auto rounded-control border border-ex-border p-3">
        {MENU_ICON_GROUPS.map((grupo) => (
          <div key={grupo.id}>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ex-text-muted">
              {ti(`grupo.${grupo.id}`)}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {grupo.icons.map((icono) => {
                const activo = elegido === icono.id;

                return (
                  <button
                    key={icono.id}
                    type="button"
                    title={ti(icono.id)}
                    aria-label={ti(icono.id)}
                    aria-pressed={activo}
                    // Volver a tocar el que ya está elegido lo saca: es la
                    // forma más natural de decir "ninguno".
                    onClick={() => setElegido(activo ? null : icono.id)}
                    className={cn(
                      "grid size-10 place-items-center rounded-control border transition-colors",
                      activo
                        ? "border-ex-blue bg-ex-blue-wash text-ex-blue-deep"
                        : "border-ex-border text-ex-text-secondary hover:border-ex-blue/45 hover:text-ex-text"
                    )}
                  >
                    <MenuIcon name={icono.id} className="size-[18px]" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ex-text-muted">
        {elegido ? ayudaElegido : ayudaVacio}
      </p>

      <input type="hidden" name={name} value={elegido ?? ""} />
    </div>
  );
}
