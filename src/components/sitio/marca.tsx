import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * El lockup de marca: el isotipo como imagen y "TOQIA" como texto.
 *
 * El logotipo completo también existe (`/marca/toqia-logo.webp`), pero acá se
 * separa a propósito: la palabra dibujada, escalada a 28px de alto en una
 * barra, se ve blanda y pesa de más. Compuesta con texto queda nítida en
 * cualquier densidad de pantalla, se puede seleccionar y la lee un lector de
 * pantalla.
 *
 * El isotipo va en .webp: son 20 KB contra 60 del PNG y lo soportan todos los
 * navegadores desde 2020. Sin `next/image` a propósito — el build es
 * `output: standalone` y el optimizador necesitaría `sharp` instalado en el
 * VPS para un archivo que ya viene del tamaño justo.
 */
export function Marca({
  className,
  isotipoClassName,
}: {
  className?: string;
  isotipoClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/toqia-isotipo.webp"
        alt=""
        aria-hidden
        width={320}
        height={227}
        className={cn("h-8 w-auto select-none", isotipoClassName)}
      />
      <span className="text-[19px] font-medium leading-none tracking-[0.22em] text-mk-text">
        TOQIA
      </span>
    </span>
  );
}

/** La marca enlazando al inicio. La barra y el pie usan esta. */
export function MarcaLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Toqia, inicio"
      className={cn(
        "rounded-control transition-opacity hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-turquoise",
        "focus-visible:ring-offset-4 focus-visible:ring-offset-mk-bg",
        className
      )}
    >
      <Marca />
    </Link>
  );
}
