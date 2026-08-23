"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Botón del panel.
 *
 * Alturas pensadas para el dedo: `md` mide 40px y `lg` 44px, que es el mínimo
 * cómodo en un celular. El primario lleva una sombra teñida del propio acento
 * — en un fondo claro es lo que lo despega del lienzo.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium " +
    "transition-[background-color,border-color,color,transform] duration-150 " +
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ex-blue/25 " +
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 " +
    "[&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-ex-blue text-white shadow-[0_6px_16px_-8px_rgba(109,91,246,0.9)] hover:bg-ex-blue-deep",
        secondary:
          "border border-ex-border bg-ex-surface text-ex-text shadow-subtle hover:border-ex-blue/45 hover:bg-ex-elevated",
        ghost:
          "border border-transparent text-ex-text-secondary hover:bg-ex-elevated hover:text-ex-text",
        outline:
          "border border-ex-border bg-transparent text-ex-text-secondary hover:border-ex-blue/45 hover:text-ex-text",
        danger:
          "border border-ex-danger/30 bg-transparent text-ex-danger hover:bg-ex-danger/10",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-3.5 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
