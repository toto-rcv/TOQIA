import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Los colores de estado aparecen solo en indicadores chicos como este,
 * nunca como fondo de secciones grandes.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 " +
    "text-[11px] font-semibold tracking-[0.01em]",
  {
    variants: {
      tone: {
        active: "border-ex-success/20 bg-ex-success/10 text-ex-success",
        inactive: "border-ex-border bg-ex-elevated text-ex-text-muted",
        warning: "border-ex-warning/25 bg-ex-warning/10 text-ex-warning",
        danger: "border-ex-danger/25 bg-ex-danger/10 text-ex-danger",
        accent: "border-ex-blue/20 bg-ex-blue-wash text-ex-blue-deep",
      },
    },
    defaultVariants: { tone: "inactive" },
  }
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Punto de estado, para cuando el badge con texto sería demasiado. */
export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        active ? "bg-ex-success" : "bg-ex-text-disabled"
      )}
    />
  );
}
