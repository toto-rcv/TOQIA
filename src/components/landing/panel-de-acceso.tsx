"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Copy, X } from "lucide-react";
import * as React from "react";

/**
 * Un acceso de la grilla que, en vez de llevar a otro lado, abre un panel.
 *
 * Es lo que necesitan los horarios y el Wi-Fi: son datos de dos renglones, y
 * mandarlos a una página aparte para volver enseguida es peor experiencia que
 * mostrarlos ahí mismo. Además no hay a dónde mandarlos — no existe una URL
 * del horario de un local.
 *
 * Sale como una hoja desde abajo y no como un cuadro centrado: esta página se
 * ve con una mano, en un celular, y el pulgar llega abajo. La hoja hereda de
 * Radix el foco atrapado, el cierre con Escape y el bloqueo del scroll de
 * atrás, que escritos a mano siempre quedan a medias.
 *
 * El contenido llega como `children` ya renderizado en el servidor: así el
 * texto traducido y los datos del local no viajan al cliente dos veces ni
 * obligan a este componente a saber nada de ellos.
 */
export function AccesoConPanel({
  titulo,
  sub,
  icono,
  cerrar,
  children,
}: {
  titulo: string;
  sub: string;
  icono: React.ReactNode;
  /** El texto del botón de cerrar, ya traducido. */
  cerrar: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      {/* Mismo `tq-tile` que los accesos que sí navegan: para el cliente son
          todos el mismo botón, y que uno abra una hoja en vez de irse a otro
          lado no es algo que tenga que anticipar por cómo se ve. */}
      <DialogPrimitive.Trigger className="tq-tile">
        {icono}
        <span className="tq-tile-title">{titulo}</span>
        <span className="tq-tile-sub">{sub}</span>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-tq-black/75 backdrop-blur-[2px]
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />

        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full
                     max-w-[460px] flex-col overflow-y-auto rounded-t-[28px] bg-tq-cream
                     pb-[max(1.75rem,env(safe-area-inset-bottom))]
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
                     data-[state=open]:slide-in-from-bottom-6
                     data-[state=closed]:slide-out-to-bottom-6"
        >
          {/* El tirador no hace nada: es la señal de que esto es una hoja que
              se baja, que es como se cierra sin buscar la cruz. Decorativo,
              así que no lo anuncia el lector de pantalla. */}
          <div aria-hidden className="flex justify-center pb-1 pt-3">
            <span className="h-1 w-10 rounded-full bg-tq-cream-border" />
          </div>

          <DialogPrimitive.Close
            aria-label={cerrar}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full
                       text-tq-ink-soft transition-colors hover:bg-tq-cream-alt
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-tq-gold"
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>

          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** La cabecera de un panel: el ícono en su medallón, el título y el subtítulo. */
export function CabeceraDePanel({
  icono,
  titulo,
  sub,
}: {
  icono: React.ReactNode;
  titulo: string;
  sub?: string | null;
}) {
  return (
    <div className="px-6 pb-5 pt-4 text-center">
      <div className="mx-auto grid size-[72px] place-items-center rounded-full bg-tq-cream-alt">
        {icono}
      </div>

      <DialogPrimitive.Title className="mt-4 font-serif text-[25px] font-semibold leading-tight text-tq-ink">
        {titulo}
      </DialogPrimitive.Title>

      {sub ? (
        <DialogPrimitive.Description className="mt-1.5 text-[14px] text-tq-ink-soft">
          {sub}
        </DialogPrimitive.Description>
      ) : (
        // Radix avisa por consola si el panel no tiene descripción. Decirle
        // que no hay es más honesto que inventar una frase de relleno.
        <DialogPrimitive.Description className="sr-only">{titulo}</DialogPrimitive.Description>
      )}
    </div>
  );
}

/**
 * Copiar al portapapeles, con la confirmación en el propio botón.
 *
 * Sin el cambio a "copiado" no hay forma de saber si funcionó: el portapapeles
 * es invisible, y alguien que no ve respuesta toca tres veces y después
 * escribe la clave a mano igual.
 */
export function BotonCopiar({
  valor,
  etiqueta,
  copiado,
  ancho = false,
}: {
  valor: string;
  /** Qué dice el botón en reposo, ya traducido. */
  etiqueta: string;
  /** Qué dice apenas copió. */
  copiado: string;
  /** A todo el ancho, con el texto al lado del ícono. */
  ancho?: boolean;
}) {
  const [listo, setListo] = React.useState(false);

  React.useEffect(() => {
    if (!listo) return;
    const timeout = setTimeout(() => setListo(false), 2000);
    return () => clearTimeout(timeout);
  }, [listo]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setListo(true);
    } catch {
      // Safari sin https, o el usuario negó el permiso. El dato está a la
      // vista igual: se puede leer y escribir a mano, que es lo que hacía
      // todo el mundo antes de que este botón existiera.
    }
  }

  if (ancho) {
    return (
      <button
        type="button"
        onClick={copiar}
        className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl
                   bg-tq-green px-5 text-[14px] font-semibold uppercase tracking-[0.06em]
                   text-white transition-[transform,background-color] duration-150
                   hover:bg-tq-green-dark active:scale-[0.985]"
      >
        {listo ? (
          <Check className="size-[18px]" aria-hidden />
        ) : (
          <Copy className="size-[18px]" aria-hidden />
        )}
        {listo ? copiado : etiqueta}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={etiqueta}
      title={listo ? copiado : etiqueta}
      className="grid size-9 shrink-0 place-items-center rounded-control text-tq-muted
                 transition-colors hover:bg-tq-cream hover:text-tq-ink"
    >
      {listo ? (
        <Check className="size-[18px] text-tq-green" aria-hidden />
      ) : (
        <Copy className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}
