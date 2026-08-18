import { requireSession } from "@/lib/session";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";

export const dynamic = "force-dynamic";

/**
 * Layout del panel.
 *
 * El guard de sesión vive acá y cubre todas las rutas de /admin de una sola
 * vez. Las Server Actions vuelven a verificar por su cuenta: un layout no
 * protege un POST directo contra una action.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="ex-scope min-h-dvh bg-ex-black text-ex-text">
      <header className="sticky top-0 z-40 border-b border-ex-border bg-ex-black/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-8 px-5">
          <div className="flex items-baseline gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ex-blue" aria-hidden />
            <span className="text-sm font-medium tracking-tight">Pulseras NFC</span>
          </div>

          <AdminNav />

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden font-mono text-[11px] text-ex-text-muted sm:inline">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">{children}</main>
    </div>
  );
}
