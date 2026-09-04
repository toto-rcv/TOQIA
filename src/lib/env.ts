/**
 * Acceso centralizado a variables de entorno.
 *
 * La idea es fallar temprano y con un mensaje entendible: si falta una
 * variable, el proceso no arranca en vez de reventar más tarde con un
 * `undefined` en medio de una query.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisá tu archivo .env (partí de .env.example).`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `[env] ${name}="${raw}" no es un entero positivo válido; se usa ${fallback}.`
    );
    return fallback;
  }
  return parsed;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get betterAuthSecret() {
    return required("BETTER_AUTH_SECRET");
  },
  get betterAuthUrl() {
    return optional("BETTER_AUTH_URL", "http://localhost:3000");
  },
  get appUrl() {
    return optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  },
  get ipHashSalt() {
    return required("IP_HASH_SALT");
  },
  /**
   * Clave de DeepL para traducir lo que escribe cada local (nombres de plato,
   * títulos de bienvenida). Opcional: sin ella el sistema funciona igual y
   * cada texto se muestra en el idioma en que lo cargó el local.
   *
   * Las claves gratuitas terminan en ":fx" y el proveedor deduce de ahí a qué
   * host pegar (ver src/lib/traduccion/proveedor.ts).
   */
  get deeplApiKey(): string | null {
    const valor = process.env.DEEPL_API_KEY;
    return valor && valor.trim() !== "" ? valor.trim() : null;
  },
  get redirectCacheTtlMs() {
    return positiveInt("REDIRECT_CACHE_TTL_SECONDS", 60) * 1000;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
