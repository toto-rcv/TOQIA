"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Copia un texto al portapapeles.
 *
 * navigator.clipboard solo existe en contextos seguros (https o localhost).
 * Como el panel se va a usar también desde la IP de la LAN durante las
 * pruebas, hay un fallback con un textarea oculto para no quedarnos sin
 * copiar en ese caso.
 */
export function CopyButton({
  value,
  className,
  label,
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const t = useTranslations("Comun");
  const etiqueta = label ?? t("copiar");
  const [copied, setCopied] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    setFailed(false);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        legacyCopy(value);
      }
      setCopied(true);
    } catch (error) {
      console.error("[copy] no se pudo copiar al portapapeles", error);
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={failed ? t("noSePudoCopiar") : etiqueta}
      aria-label={etiqueta}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-control border border-ex-border",
        "text-ex-text-muted transition-colors hover:border-ex-blue/40 hover:text-ex-text",
        "active:scale-[0.98]",
        copied && "border-ex-success/40 text-ex-success",
        failed && "border-ex-danger/40 text-ex-danger",
        className
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function legacyCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const succeeded = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!succeeded) throw new Error("execCommand('copy') devolvió false");
}
