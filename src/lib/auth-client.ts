"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Cliente de Better Auth para los componentes de cliente.
 * baseURL vacío = mismo origen, que es lo que queremos siempre acá.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
