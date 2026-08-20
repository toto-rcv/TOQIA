"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Selector de local para la edición de la página pública. */
export function LocationPicker({
  locations,
  current,
}: {
  locations: { id: number; name: string }[];
  current: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1 rounded-control border border-ex-border bg-ex-surface p-1">
      {locations.map((local) => (
        <button
          key={local.id}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() =>
              router.push(`/panel/configuracion?local=${local.id}`)
            )
          }
          className={cn(
            "rounded-[3px] px-3 py-1.5 text-xs transition-colors",
            local.id === current
              ? "bg-ex-blue-deep text-white"
              : "text-ex-text-muted hover:text-ex-text"
          )}
        >
          {local.name}
        </button>
      ))}
    </div>
  );
}
