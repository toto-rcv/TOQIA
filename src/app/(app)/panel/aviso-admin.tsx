"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import * as React from "react";

import { salirDelPanelDeLaEmpresa } from "../admin/actions";

/**
 * La franja que ve el admin cuando está operando el panel de un restaurante.
 *
 * No es decoración: sin ella, un admin que se olvidó de que entró al panel de
 * un cliente termina editándole la carta creyendo que es la suya. Por eso va
 * arriba de todo, ocupa el ancho completo y dice el nombre del restaurante.
 */
import { useTranslations } from "next-intl";

export function AvisoDeAdmin({ nombreDeCuenta }: { nombreDeCuenta: string }) {
  const router = useRouter();
  const tStats = useTranslations("Stats");
  const tNav = useTranslations("Nav");
  const [pending, startTransition] = React.useTransition();

  function salir() {
    startTransition(async () => {
      await salirDelPanelDeLaEmpresa();
      router.push("/admin/cuentas");
    });
  }

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2
                 rounded-card border border-ex-warning/30 bg-ex-warning/10 px-4 py-2.5"
    >
      <p className="flex min-w-0 items-center gap-2 text-[12.5px] text-ex-text">
        <Eye className="size-4 shrink-0 text-ex-warning" aria-hidden />
        <span className="min-w-0">
          {tStats("viendoComoAdmin", { nombre: nombreDeCuenta })}
        </span>
      </p>

      <button
        type="button"
        onClick={salir}
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border
                   border-ex-border bg-ex-surface px-3 py-1.5 text-[12px] font-medium
                   text-ex-text-secondary transition-colors hover:border-ex-blue/40
                   hover:text-ex-text disabled:opacity-40"
      >
        <ArrowLeft className="size-3.5" />
        {pending ? tNav("saliendo") : tStats("volverAlAdmin")}
      </button>
    </div>
  );
}
