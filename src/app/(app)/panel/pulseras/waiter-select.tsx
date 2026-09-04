"use client";

import * as React from "react";

import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { assignWaiter } from "../actions";

/**
 * Asigna una pulsera a un camarero desde la propia fila de la tabla.
 *
 * Es la operación que más se repite cuando arranca un turno, así que se hace
 * sin diálogos ni navegación: elegís del desplegable y se guarda.
 */
export function WaiterSelect({
  braceletId,
  waiterId,
  waiters,
}: {
  braceletId: number;
  waiterId: number | null;
  /** Solo los camareros del mismo local que la pulsera. */
  waiters: { id: number; name: string; active: boolean }[];
}) {
  const [valor, setValor] = React.useState(waiterId ? String(waiterId) : "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setValor(waiterId ? String(waiterId) : "");
  }, [waiterId]);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nuevo = event.target.value;
    const anterior = valor;

    setValor(nuevo);
    setError(null);

    startTransition(async () => {
      const resultado = await assignWaiter(
        braceletId,
        nuevo === "" ? null : Number(nuevo)
      );
      if (!resultado.ok) {
        // Si falló, volvemos al valor previo para no mentirle al usuario
        // mostrando una asignación que no se guardó.
        setValor(anterior);
        setError(resultado.error);
      }
    });
  }

  if (waiters.length === 0) {
    return (
      <span className="text-[11px] text-ex-text-disabled">
        sin camareros en este local
      </span>
    );
  }

  return (
    <div>
      <Select
        value={valor}
        onChange={handleChange}
        disabled={pending}
        aria-label="Camarero asignado"
        // h-10 para que en el celular sea un objetivo de toque real.
        className={cn("h-10 w-full text-[13px] lg:h-9", error && "border-ex-danger")}
      >
        <option value="">Sin asignar</option>
        {waiters.map((camarero) => (
          <option key={camarero.id} value={camarero.id}>
            {camarero.name}
            {camarero.active ? "" : " (inactivo)"}
          </option>
        ))}
      </Select>

      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-ex-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
