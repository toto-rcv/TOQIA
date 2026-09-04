import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * `Link` y compañía con conciencia del idioma: al navegar dentro del sitio
 * comercial mantienen el prefijo (`/en/...`) sin que cada enlace tenga que
 * acordarse. `getPathname` es lo que arma las URLs alternativas del `hreflang`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
