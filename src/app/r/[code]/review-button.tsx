"use client";

import { Star } from "lucide-react";
import * as React from "react";

/**
 * Botón de "Dejar reseña".
 *
 * Antes de mandar a Google avisa al servidor que la persona hizo clic. De ahí
 * sale la tasa de conversión que ve el restaurante: cuántos de los que
 * escanearon llegaron efectivamente a la reseña.
 *
 * Dos cosas importantes del diseño:
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
}: {
  href: string;
  /** Puede ser null si el registro del escaneo falló: el botón sigue andando,
   *  solo que ese clic no se contabiliza. */
  token: string | null;
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
      className="tq-btn-primary"
    >
      <Star className="size-5 fill-current" aria-hidden />
      Dejar reseña en Google
    </a>
  );
}
