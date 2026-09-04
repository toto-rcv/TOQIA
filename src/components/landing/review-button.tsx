"use client";

import * as React from "react";

/**
 * Botón de "Dejar mi reseña".
 *
 * Antes de mandar a Google avisa al servidor que la persona hizo clic. De ahí
 * sale la tasa de conversión que ve el restaurante: cuántos de los que
 * escanearon llegaron efectivamente a la reseña.
 *
 * Dos decisiones importantes:
 *
 *  - Es un `<a>` de verdad, con href real. Si el JavaScript no cargó o falla,
 *    el link funciona igual y la persona llega a Google. La métrica es
 *    secundaria; que el cliente pueda dejar la reseña no lo es.
 *
 *  - Usa `sendBeacon`, que le pide al navegador que mande el aviso incluso
 *    mientras la página se está yendo. Con un `fetch` común, la navegación
 *    cancelaría el pedido y perderíamos la mitad de los clics.
 */
export function ReviewButton({
  href,
  token,
  label,
}: {
  href: string;
  /** Puede ser null si el registro del escaneo falló: el botón sigue andando,
   *  solo que ese clic no se contabiliza. */
  token: string | null;
  /**
   * El texto del botón, ya traducido. Llega como prop y no se resuelve acá
   * adentro para no mandarle el diccionario de traducciones al celular del
   * cliente: este es el único componente cliente de la página y no tiene por
   * qué arrastrar next-intl consigo.
   */
  label: string;
}) {
  const yaAvisado = React.useRef(false);

  function avisar() {
    if (!token || yaAvisado.current) return;
    yaAvisado.current = true;

    const cuerpo = JSON.stringify({ token });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/review-click",
          new Blob([cuerpo], { type: "application/json" })
        );
        return;
      }

      // Navegadores sin sendBeacon: keepalive cumple la misma función.
      void fetch("/api/review-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {
        // Silencio a propósito: la persona ya se está yendo a Google y no
        // podemos ni queremos interrumpirla con un error.
      });
    } catch {
      // Idem. Nunca bloqueamos la navegación por la métrica.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={avisar}
      onAuxClick={avisar}
      className="tq-btn-review"
    >
      <GoogleGlyph />
      {label}
    </a>
  );
}

/**
 * La G de Google, en SVG inline.
 *
 * Va embebida y no como imagen remota porque esta página tiene que renderizar
 * completa aunque el celular esté con la señal justa: un pedido menos es un
 * punto menos de falla en la pantalla que más importa del sistema.
 */
function GoogleGlyph() {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white"
    >
      <svg viewBox="0 0 48 48" className="size-4">
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.6 24.6c0-1.6-.15-3.2-.43-4.6H24v9.1h12.7c-.55 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 7-10.1 7-17.5z"
        />
        <path
          fill="#FBBC05"
          d="M10.4 28.7a14.6 14.6 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
        />
      </svg>
    </span>
  );
}
