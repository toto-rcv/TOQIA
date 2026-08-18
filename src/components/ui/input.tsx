import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-9 w-full rounded-control border border-ex-border bg-ex-black px-3 text-sm text-ex-text",
      "placeholder:text-ex-text-disabled",
      "focus:border-ex-blue focus:outline-none focus:ring-1 focus:ring-ex-blue/40",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-control border border-ex-border bg-ex-black px-3 py-2 text-sm text-ex-text",
      "placeholder:text-ex-text-disabled",
      "focus:border-ex-blue focus:outline-none focus:ring-1 focus:ring-ex-blue/40",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-label font-medium text-ex-text-secondary",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

/** Select nativo estilado: menos JS y mejor comportamiento en celular. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 w-full appearance-none rounded-control border border-ex-border bg-ex-black px-3 text-sm text-ex-text",
      "focus:border-ex-blue focus:outline-none focus:ring-1 focus:ring-ex-blue/40",
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23647184%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_0.6rem_center] bg-no-repeat pr-8",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
