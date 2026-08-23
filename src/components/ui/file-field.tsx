"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import * as React from "react";

import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo para subir una imagen o un PDF, con vista de lo que ya hay cargado.
 *
 * Manda dos cosas al servidor:
 *   `<name>File`   → el archivo nuevo, si eligieron uno
 *   `<name>Remove` → "1" si apretaron quitar
 *
 * Si no pasa ninguna de las dos, el servidor deja lo que estaba. Eso permite
 * guardar el formulario mil veces sin volver a subir las fotos cada vez.
 *
 * El archivo anterior lo borra el servidor al guardar: nunca quedan dos
 * versiones de la misma foto ocupando lugar.
 */
export function FileField({
  name,
  label,
  actual,
  formato,
  hint,
  /** Cómo se ve la miniatura. `redonda` para logos. */
  forma = "cuadrada",
}: {
  name: string;
  label: string;
  actual: string | null;
  formato: "imagen" | "pdf";
  hint?: string;
  forma?: "cuadrada" | "redonda" | "ancha";
}) {
  const [elegido, setElegido] = React.useState<string | null>(null);
  const [quitar, setQuitar] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const hayAlgo = Boolean(actual) && !quitar;
  const inputId = `f-${name}`;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setElegido(file ? file.name : null);
    // Elegir un archivo y a la vez pedir que se quite no tiene sentido:
    // gana el archivo nuevo.
    if (file) setQuitar(false);
  }

  function handleQuitar() {
    setQuitar(true);
    setElegido(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDeshacer() {
    setQuitar(false);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>

      <div className="flex items-start gap-3 rounded-control border border-ex-border bg-ex-surface-raised p-3">
        {/* Lo que hay hoy */}
        <div className="shrink-0">
          {hayAlgo && formato === "imagen" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={actual!}
              alt=""
              className={cn(
                "border border-ex-border bg-ex-surface object-cover",
                forma === "redonda" && "size-14 rounded-full",
                forma === "cuadrada" && "size-14 rounded-control",
                forma === "ancha" && "h-14 w-24 rounded-control"
              )}
            />
          ) : hayAlgo ? (
            <a
              href={actual!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-14 flex-col items-center justify-center gap-1 rounded-control
                         border border-ex-border text-ex-text-muted transition-colors
                         hover:border-ex-blue/40 hover:text-ex-text"
              title="Ver el archivo actual"
            >
              <FileText className="size-5" aria-hidden />
              <span className="text-[9px] uppercase tracking-wide">PDF</span>
            </a>
          ) : (
            <div
              className="flex size-14 items-center justify-center rounded-control border
                         border-dashed border-ex-border text-ex-text-disabled"
              aria-hidden
            >
              <Upload className="size-5" />
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            id={inputId}
            name={`${name}File`}
            type="file"
            accept={formato === "pdf" ? "application/pdf" : "image/*"}
            onChange={handleChange}
            className="block w-full cursor-pointer text-xs text-ex-text-muted
                       file:mr-3 file:cursor-pointer file:rounded-control file:border
                       file:border-ex-border file:bg-ex-surface file:px-3 file:py-1.5
                       file:text-xs file:text-ex-text file:transition-colors
                       hover:file:border-ex-blue/40"
          />

          {elegido ? (
            <p className="truncate text-[11px] text-ex-success">
              Se va a subir: {elegido}
            </p>
          ) : quitar ? (
            <p className="text-[11px] text-ex-danger">
              Se va a quitar al guardar.{" "}
              <button
                type="button"
                onClick={handleDeshacer}
                className="underline underline-offset-2 hover:text-ex-text"
              >
                Deshacer
              </button>
            </p>
          ) : actual ? (
            <button
              type="button"
              onClick={handleQuitar}
              className="inline-flex items-center gap-1.5 text-[11px] text-ex-text-muted
                         transition-colors hover:text-ex-danger"
            >
              <Trash2 className="size-3" aria-hidden />
              Quitar
            </button>
          ) : null}
        </div>
      </div>

      {/* Solo viaja si está marcado; si no, el servidor conserva lo que había. */}
      {quitar ? <input type="hidden" name={`${name}Remove`} value="1" /> : null}

      {hint ? <p className="text-[11px] text-ex-text-muted">{hint}</p> : null}
    </div>
  );
}
