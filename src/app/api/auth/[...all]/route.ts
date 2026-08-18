import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Better Auth resuelve acá todas sus rutas: sign-in, sign-out, get-session, etc.
export const { GET, POST } = toNextJsHandler(auth);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
