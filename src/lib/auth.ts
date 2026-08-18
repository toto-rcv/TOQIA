import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { env } from "./env";

/**
 * Configuración de Better Auth.
 *
 * El panel es de uso interno: hay email + contraseña y NO hay registro
 * público. Los usuarios se crean con el script de seed o a mano.
 */
export const auth = betterAuth({
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,

  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: { user, session, account, verification },
  }),

  emailAndPassword: {
    enabled: true,
    // Sin esto quedaría abierto /api/auth/sign-up/email y cualquiera podría
    // crearse una cuenta con acceso al panel.
    disableSignUp: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // refresca la sesión una vez por día
    cookieCache: {
      // Evita ir a la base en cada request del panel para validar la sesión.
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  advanced: {
    // Detrás de Caddy la app ve http; el flag secure se decide por entorno.
    useSecureCookies: env.isProduction,
  },

  // Necesario para que las Server Actions puedan setear cookies de sesión.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
