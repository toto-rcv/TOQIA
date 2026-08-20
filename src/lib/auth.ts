import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { env } from "./env";

/**
 * Configuración de Better Auth.
 *
 * El sistema tiene tres roles y no hay registro público: todos los usuarios los
 * crea el admin. Por eso `role` y `accountId` llevan `input: false`, que impide
 * que alguien los mande desde el cliente e intente auto-asignarse permisos.
 */
export const auth = betterAuth({
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,

  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: { user, session, account, verification },
  }),

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "restaurant",
        // Nunca aceptar este campo desde un request del cliente.
        input: false,
      },
      accountId: {
        type: "number",
        required: false,
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    // Sin esto quedaría abierto /api/auth/sign-up/email y cualquiera podría
    // crearse una cuenta.
    disableSignUp: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  /**
   * Orígenes desde los que se acepta un pedido de login.
   *
   * Better Auth rechaza los que no estén acá como medida anti-CSRF, y desde el
   * navegador ese rechazo se ve como un genérico "Failed to fetch" que no dice
   * nada. Pasaba, por ejemplo, entrando por `127.0.0.1` cuando
   * BETTER_AUTH_URL decía `localhost`.
   *
   * En producción se aceptan únicamente las URLs configuradas. En desarrollo
   * se acepta además el origen del propio pedido, siempre que sea local o de
   * una red privada: así funciona en cualquier puerto y también cuando se
   * prueba el escaneo desde el celular con la IP de la LAN, sin tener que
   * mantener una lista a mano.
   */
  trustedOrigins: (request) => {
    const permitidos = [env.betterAuthUrl, env.appUrl].filter(Boolean);
    if (env.isProduction) return permitidos;

    const origen = request?.headers.get("origin");
    if (origen && esOrigenLocal(origen)) permitidos.push(origen);

    return permitidos;
  },

  advanced: {
    useSecureCookies: env.isProduction,
  },

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

/**
 * ¿El origen es de la máquina local o de una red privada?
 *
 * Cubre localhost, loopback IPv4/IPv6 y los tres rangos privados de la RFC
 * 1918, que es donde caen los routers hogareños. Solo se usa en desarrollo.
 */
function esOrigenLocal(origen: string): boolean {
  let host: string;
  try {
    host = new URL(origen).hostname;
  } catch {
    return false;
  }

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.endsWith(".local")) return true;

  // 10.x.x.x · 192.168.x.x · 172.16.x.x a 172.31.x.x
  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}
