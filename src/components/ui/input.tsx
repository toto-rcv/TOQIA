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
      // Los inputs de fecha traen un ícono de calendario negro que sobre fondo
      // oscuro es invisible: se invierte para que se vea.
      "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
      "[&::-webkit-calendar-picker-indicator]:opacity-60",
      "[&::-webkit-calendar-picker-indicator]:invert",
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
    className={cn("block text-label font-medium text-ex-text-secondary", className)}
    {...props}
  />
));
Label.displayName = "Label";

/**
 * Select nativo estilado.
 *
 * Menos JavaScript y mejor comportamiento en celular que un desplegable
 * propio. El estilo vive en `.ex-select` dentro de globals.css: la flecha es
 * un SVG embebido que, escrito como clase arbitraria de Tailwind, se rompía
 * por los espacios del `viewBox` y dejaba el control sin fondo — blanco sobre
 * blanco. En CSS plano no hay ese problema.
 *
 * Ahí también se estilan los `<option>`, porque el desplegable que abre el
 * sistema operativo no hereda el color del `<select>` y salía blanco.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn("ex-select", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
