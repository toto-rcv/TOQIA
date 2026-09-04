"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
  const t = useTranslations("Login");
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  /** Momento hasta el que el servidor no va a aceptar otro intento. */
  const [bloqueadoHasta, setBloqueadoHasta] = React.useState<number | null>(null);
  const [restante, setRestante] = React.useState(0);

  // Cuenta regresiva. El reloj corre en el navegador pero la verdad la tiene el
  // servidor: esto es para que la espera se vea, no para autorizar nada. Si
  // alguien adelanta el reloj de su máquina, el 429 lo frena igual.
  React.useEffect(() => {
    if (bloqueadoHasta === null) return;

    function tic() {
      const segundos = Math.max(
        0,
        Math.ceil((bloqueadoHasta! - Date.now()) / 1000)
      );
      setRestante(segundos);
      if (segundos === 0) {
        setBloqueadoHasta(null);
        setError(null);
      }
    }

    tic();
    const id = window.setInterval(tic, 1000);
    return () => window.clearInterval(id);
  }, [bloqueadoHasta]);

  const bloqueado = restante > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bloqueado) return;

    setError(null);
    setPending(true);

    try {
      const result = await signIn.email({ email, password });

      if (result.error) {
        const espera = segundosDeBloqueo(result.error);

        if (espera !== null) {
          setBloqueadoHasta(Date.now() + espera * 1000);
          setRestante(espera);
          setPassword("");
          return;
        }

        // No distinguimos "usuario inexistente" de "contraseña incorrecta":
        // eso le diría a un atacante qué emails existen en el sistema.
        setError(t("errorCredenciales"));
        return;
      }

      // La raíz redirige según el rol, así el formulario no necesita saber
      // a dónde va cada tipo de usuario.
      // A /empresa, no a "/": la raíz es ahora el sitio público de Toqia.
      router.push("/empresa");
      router.refresh();
    } catch (cause) {
      // Un "Failed to fetch" no es una contraseña mal puesta: es que el pedido
      // ni siquiera llegó. Casi siempre el servidor se cayó o se está
      // reiniciando. Decirlo así ahorra buscar el problema donde no está.
      console.error("[login] fallo el intento de ingreso", cause);
      const esFalloDeRed =
        cause instanceof TypeError ||
        (cause instanceof Error && /fetch/i.test(cause.message));

      setError(esFalloDeRed ? t("errorRed") : t("errorInesperado"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={bloqueado}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@toqia.local"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={bloqueado}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {bloqueado ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-control border border-ex-warning/30 bg-ex-warning/10 px-3 py-2 text-xs leading-relaxed text-ex-text"
        >
          {t.rich("bloqueo", {
            restante,
            n: (chunks) => (
              <span className="font-semibold tabular-nums">{chunks}</span>
            ),
          })}
        </p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-control border border-ex-danger/25 bg-ex-danger/10 px-3 py-2 text-xs text-ex-danger"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={pending || bloqueado}
      >
        {bloqueado
          ? t("espera", { n: restante })
          : pending
            ? t("ingresando")
            : t("boton")}
      </Button>
    </form>
  );
}

/**
 * Cuántos segundos hay que esperar, o null si el error no es un bloqueo.
 *
 * El cliente de Better Auth normaliza el error y no garantiza qué campos del
 * cuerpo deja pasar, así que se prueban tres fuentes en orden de preferencia:
 * el campo propio, el texto del mensaje, y por último el minuto que sabemos
 * que dura el bloqueo. Lo que no se adivina es *si* está bloqueado: eso lo
 * dice el 429 o nuestro código, nada más.
 */
function segundosDeBloqueo(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;

  const datos = error as {
    status?: number;
    code?: string;
    message?: string;
    segundosRestantes?: unknown;
  };

  const esBloqueo = datos.status === 429 || datos.code === "DEMASIADOS_INTENTOS";
  if (!esBloqueo) return null;

  if (typeof datos.segundosRestantes === "number" && datos.segundosRestantes > 0) {
    return datos.segundosRestantes;
  }

  const delMensaje = datos.message?.match(/(\d+)\s*segundos?/i);
  if (delMensaje) {
    const segundos = Number(delMensaje[1]);
    if (Number.isFinite(segundos) && segundos > 0) return segundos;
  }

  return 60;
}
