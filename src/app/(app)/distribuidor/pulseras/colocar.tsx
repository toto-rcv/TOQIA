"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Select } from "@/components/ui/input";
import { colocarPulsera } from "../actions";

export type LocalOption = {
  id: number;
  name: string;
  accountName: string;
};

/**
 * Dónde va esta pulsera.
 *
 * Es un desplegable que guarda al soltarlo, sin botón de confirmar: colocar
 * veinte pulseras es la tarea repetitiva del distribuidor, y un paso extra por
 * pulsera se siente enseguida.
 *
 * Si la acción falla, el desplegable vuelve al valor anterior: dejarlo
 * mostrando un local al que la pulsera no fue sería peor que no haber hecho
 * nada.
 */
export function ColocarSelect({
  braceletId,
  locationId,
  locales,
}: {
  braceletId: number;
  locationId: number | null;
  locales: LocalOption[];
}) {
  const t = useTranslations("Distribuidor");
  const router = useRouter();
  const [valor, setValor] = React.useState(locationId ? String(locationId) : "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function cambiar(siguiente: string) {
    const anterior = valor;
    setValor(siguiente);
    setError(null);

    const formData = new FormData();
    formData.set("braceletId", String(braceletId));
    formData.set("locationId", siguiente);

    startTransition(async () => {
      const resultado = await colocarPulsera(formData);
      if (!resultado.ok) {
        setValor(anterior);
        setError(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="min-w-0">
      <Select
        value={valor}
        onChange={(event) => cambiar(event.target.value)}
        disabled={pending}
        aria-label={t("localDeLaPulsera")}
        className="text-[12px]"
      >
        <option value="">{t("enStock")}</option>
        {locales.map((local) => (
          <option key={local.id} value={local.id}>
            {local.accountName} · {local.name}
          </option>
        ))}
      </Select>

      {error ? (
        <p role="alert" className="mt-1 text-[11px] leading-snug text-ex-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
