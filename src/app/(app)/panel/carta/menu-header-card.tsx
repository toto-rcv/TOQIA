"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileField } from "@/components/ui/file-field";
import { updateMenuHeader } from "./actions";

/**
 * La imagen que encabeza la carta pública.
 *
 * Va en su propio formulario y no dentro del editor de categorías: es una
 * sola cosa, se cambia cada muerte de obispo y no tiene por qué obligar a
 * guardar todo lo demás.
 */
export function MenuHeaderCard({
  locationId,
  actual,
}: {
  locationId: number;
  actual: string | null;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [guardado, setGuardado] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!guardado) return;
    const timeout = setTimeout(() => setGuardado(false), 2500);
    return () => clearTimeout(timeout);
  }, [guardado]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setGuardado(false);

    startTransition(async () => {
      const resultado = await updateMenuHeader(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setGuardado(true);
    });
  }

  return (
    <Card className="mb-4">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <input type="hidden" name="locationId" value={locationId} />

        <FileField
          name="header"
          label="Imagen de la carta"
          actual={actual}
          formato="imagen"
          forma="ancha"
          hint="Aparece arriba de todo en la carta que ve el cliente. Se muestra apaisada; una foto horizontal del salón o de un plato estrella queda bien."
        />

        {error ? (
          <p
            role="alert"
            className="rounded-control border border-ex-danger/25 bg-ex-danger/10 px-3 py-2 text-xs text-ex-danger"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Guardando…" : "Guardar imagen"}
          </Button>

          {guardado ? (
            <span className="flex items-center gap-1.5 text-xs text-ex-success">
              <Check className="size-3.5" />
              Guardado.
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
