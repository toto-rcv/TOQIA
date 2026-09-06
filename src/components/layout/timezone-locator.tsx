"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { guardarUbicacion } from "@/lib/ubicacion";

/**
 * Detecta el huso horario real de quien abre el panel y lo guarda, para que
 * las fechas de escaneos se muestren en su hora y no siempre en la de
 * Argentina.
 *
 * Pide la ubicación del navegador (`navigator.geolocation`) en vez de leer
 * directamente `Intl.DateTimeFormat().resolvedOptions().timeZone` porque lo
 * que pidieron es la ubicación real, no el reloj del sistema operativo — que
 * alguien puede tener mal configurado o distinto de dónde está parado.
 *
 * No dibuja nada: vive montado una sola vez en `PanelShell`, así que corre
 * en los tres paneles (admin, restaurante, distribuidor) apenas se entra,
 * pero nunca en las páginas públicas que ve un cliente del restaurante
 * (la landing, la carta, el redirect de la pulsera) — ahí pedirle permiso de
 * ubicación a alguien que solo quiere dejar una reseña sería un despropósito.
 */
export function TimezoneLocator() {
  const router = useRouter();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    // Una vez por pestaña alcanza: no tiene sentido volver a pedir permiso
    // (ni a consultar el GPS) cada vez que se navega a otra sección del
    // panel. Si el navegador bloquea sessionStorage (modo privado estricto),
    // se pregunta una vez de más en vez de quedarse sin la hora correcta.
    const FLAG = "toqia:ubicacion-pedida";
    try {
      if (sessionStorage.getItem(FLAG)) return;
      sessionStorage.setItem(FLAG, "1");
    } catch {
      // seguimos igual
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        guardarUbicacion(posicion.coords.latitude, posicion.coords.longitude)
          .then(() => router.refresh())
          .catch(() => {
            // Si falla el guardado, el panel se queda mostrando la hora de
            // Argentina — no hay nada más que intentar acá.
          });
      },
      () => {
        // Permiso denegado, tardó demasiado, o el dispositivo no puede
        // resolver la posición: se sigue mostrando la hora de Argentina,
        // que es exactamente el comportamiento por defecto.
      },
      {
        timeout: 8000,
        // Una posición de hasta 12 horas sirve igual para saber el huso
        // horario: no hace falta forzar un GPS nuevo cada vez.
        maximumAge: 12 * 60 * 60 * 1000,
      }
    );
  }, [router]);

  return null;
}
