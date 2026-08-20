"use client";

import { Check, Pencil, X } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateDestination } from "./actions";

/**
 * Edición inline del destino.
 *
 * Es la operación central del panel: cambiar a dónde apunta una pulsera sin
 * tocar el chip. Por eso se edita en la misma fila, sin diálogos ni
 * navegación, y guarda con Enter.
 */
export function DestinationCell({
  braceletId,
  value,
}: {
  braceletId: number;
  value: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saved, setSaved] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Si el listado se revalida desde el servidor, tomamos el valor nuevo
  // salvo que el usuario esté editando en ese momento.
  React.useEffect(() => {
    if (!editing) {
      setSaved(value);
      setDraft(value);
    }
  }, [value, editing]);

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function cancel() {
    setDraft(saved);
    setError(null);
    setEditing(false);
  }

  function save() {
    const trimmed = draft.trim();

    if (trimmed === saved) {
      setEditing(false);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await updateDestination(braceletId, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(trimmed);
      setError(null);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="min-w-0 flex-1 truncate font-mono text-xs text-ex-text-secondary"
          title={saved}
        >
          {saved}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar destino"
          title="Editar destino"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control
                     border border-ex-border text-ex-text-muted transition-colors
                     hover:border-ex-blue/40 hover:text-ex-blue-bright active:scale-[0.98]"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          disabled={pending}
          autoFocus
          spellCheck={false}
          className={cn("h-7 font-mono text-xs", error && "border-ex-danger")}
          placeholder="https://g.page/r/..../review"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          aria-label="Guardar"
          title="Guardar (Enter)"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control
                     border border-ex-blue/40 text-ex-blue-bright transition-colors
                     hover:bg-ex-blue/10 disabled:opacity-40"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          aria-label="Cancelar"
          title="Cancelar (Esc)"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control
                     border border-ex-border text-ex-text-muted transition-colors
                     hover:text-ex-text disabled:opacity-40"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-ex-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
