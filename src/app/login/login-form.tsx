"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await signIn.email({ email, password });

      if (result.error) {
        // No distinguimos "usuario inexistente" de "contraseña incorrecta":
        // eso le diría a un atacante qué emails existen en el sistema.
        setError("Email o contraseña incorrectos.");
        return;
      }

      // La raíz redirige según el rol, así el formulario no necesita saber
      // a dónde va cada tipo de usuario.
      router.push("/");
      router.refresh();
    } catch (cause) {
      // Un "Failed to fetch" no es una contraseña mal puesta: es que el pedido
      // ni siquiera llegó. Casi siempre el servidor se cayó o se está
      // reiniciando. Decirlo así ahorra buscar el problema donde no está.
      console.error("[login] fallo el intento de ingreso", cause);
      const esFalloDeRed =
        cause instanceof TypeError ||
        (cause instanceof Error && /fetch/i.test(cause.message));

      setError(
        esFalloDeRed
          ? "No se pudo contactar al servidor. Revisá que esté corriendo y probá de nuevo."
          : "Ocurrió un error inesperado al ingresar. Probá de nuevo."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@pulseras.local"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-ex-danger/25 bg-ex-danger/10 px-3 py-2 text-xs text-ex-danger"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
