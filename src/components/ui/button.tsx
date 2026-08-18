"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Botón del panel (executive-dashboard-ui).
 * Sin sombras, radio chico, y una reducción sutil al presionar.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium " +
    "transition-[background-color,border-color,color,transform] duration-150 " +
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ex-blue focus-visible:ring-offset-0 " +
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 " +
    "[&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ex-blue-deep text-white hover:bg-ex-blue",
        secondary:
          "border border-ex-border bg-ex-elevated text-ex-text hover:border-ex-blue/40",
        ghost:
          "border border-transparent text-ex-text-secondary hover:bg-ex-elevated hover:text-ex-text",
        outline:
          "border border-ex-border bg-transparent text-ex-text-secondary hover:border-ex-blue/40 hover:text-ex-text",
        danger:
          "border border-ex-danger/30 bg-transparent text-ex-danger hover:bg-ex-danger/10",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-10 px-4 text-sm",
        icon: "h-8 w-8",
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
