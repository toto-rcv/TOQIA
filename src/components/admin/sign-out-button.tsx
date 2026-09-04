"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

import { useTranslations } from "next-intl";

export function SignOutButton() {
  const router = useRouter();
  const t = useTranslations("Nav");
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("[sign-out] no se pudo cerrar la sesión", error);
      // Si el servidor no responde, al menos sacamos al usuario de las
      // pantallas del panel.
      router.push("/login");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      title={t("cerrarSesion")}
      className="w-full justify-center lg:justify-start"
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      {/* En la lateral colapsada (tablet) queda solo el ícono. */}
      <span className="hidden max-sm:inline lg:inline">
        {pending ? t("saliendo") : t("cerrarSesion")}
      </span>
    </Button>
  );
}
