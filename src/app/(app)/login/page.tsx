import { redirect } from "next/navigation";

import { SelectorIdioma } from "@/components/landing/selector-idioma";
import { getSessionUser, homeForRole } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Si ya hay sesión no tiene sentido mostrar el formulario.
  const user = await getSessionUser();
  if (user) redirect(homeForRole(user.role));

  const { error } = await searchParams;

  return (
    <main className="ex-scope relative flex min-h-dvh items-center justify-center bg-ex-black px-6 py-16">
      {/* El selector vive en la esquina superior derecha de la pantalla, no
          del formulario: así no pelea con el logo ni con el título. El idioma
          que elija acá se guarda en cookie y persiste en los paneles. */}
      <div className="absolute right-5 top-5">
        <SelectorIdioma volverA="/login" tono="carta" />
      </div>

      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ex-text-muted">
            Toqia
          </p>
          <h1 className="mt-2 text-xl font-medium tracking-tight text-ex-text">
            Ingresar
          </h1>
        </div>

        {error === "sin-cuenta" ? (
          <p className="mb-4 rounded-control border border-ex-warning/25 bg-ex-warning/10 px-3 py-2 text-xs text-ex-warning">
            Tu usuario no tiene un restaurante asignado. Escribinos para que lo
            configuremos.
          </p>
        ) : null}

        <div className="rounded-card border border-ex-border bg-ex-surface px-6 py-6">
          <LoginForm />
        </div>

        <p className="mt-6 font-mono text-[11px] tracking-[0.08em] text-ex-text-disabled">
          Acceso restringido. No hay registro público.
        </p>
      </div>
    </main>
  );
}
