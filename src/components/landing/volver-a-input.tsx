"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

/**
 * Campo oculto para el formulario de cambio de idioma.
 *
 * Resuelve dinámicamente la ruta actual (`pathname` + `searchParams`) si no se
 * provee un `initialVolverA` explícito, garantizando que el usuario siempre
 * permanezca en la página exacta donde estaba al cambiar de idioma.
 */
export function VolverAInput({ initialVolverA }: { initialVolverA?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams?.toString();
  const currentPath = pathname ? pathname + (search ? `?${search}` : "") : "/";
  const target = initialVolverA || currentPath;

  return <input type="hidden" name="volverA" value={target} />;
}
