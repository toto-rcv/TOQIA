import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Ingresar · Pulseras NFC",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Si ya hay sesión no tiene sentido mostrar el formulario.
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <main className="ex-scope flex min-h-dvh items-center justify-center bg-ex-black px-6 py-16">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ex-text-muted">
            Pulseras NFC
          </p>
          <h1 className="mt-2 text-xl font-medium tracking-tight text-ex-text">
            Panel de administración
          </h1>
        </div>

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
