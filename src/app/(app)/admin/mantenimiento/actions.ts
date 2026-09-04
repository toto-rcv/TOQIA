"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { pool } from "@/db";
import { aplicarMigraciones, type InformeMigracion } from "@/lib/migraciones";
import { invalidateAll } from "@/lib/redirect-cache";
import {
  borrarTodosLosDatos,
  FRASE_DE_CONFIRMACION,
  type ResultadoBorrado,
} from "@/lib/reset-datos";
import { requireAdmin } from "@/lib/session";
import {
  traducirTodoElContenido,
  type ResultadoBackfill,
} from "@/lib/traduccion/backfill";
import { fail, ok, readString, type ActionResult } from "@/lib/validation";

/**
 * Acciones de mantenimiento.
 *
 * Las dos son irreversibles a su manera y las dos empiezan por `requireAdmin()`:
 * el layout de /admin protege las páginas, pero no protege un POST directo
 * contra una Server Action.
 */

/* ── Migraciones ──────────────────────────────────────────────────────────── */

export async function ejecutarMigraciones(): Promise<
  ActionResult<InformeMigracion>
> {
  await requireAdmin();

  try {
    const informe = await aplicarMigraciones(pool);

    // Las páginas que fallaban por una columna faltante tienen que volver a
    // renderizarse; si no, siguen mostrando el error cacheado.
    revalidatePath("/admin", "layout");
    revalidatePath("/panel", "layout");

    return ok(informe);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    const t = await getTranslations("Errores");
    return fail(t("noSePudoMigrar", { detalle }));
  }
}

/* ── Traducción del contenido ─────────────────────────────────────────────── */

/**
 * Traduce a los siete idiomas todo lo que los locales cargaron antes de que
 * existiera la traducción automática.
 *
 * Puede tardar: son siete pedidos a DeepL por plato y van en serie para no
 * comerse un 429. No hay confirmación porque no destruye nada; correrlo dos
 * veces la segunda vez no hace ni un pedido.
 */
export async function traducirContenido(): Promise<
  ActionResult<ResultadoBackfill>
> {
  await requireAdmin();

  try {
    const resultado = await traducirTodoElContenido();

    // Las cartas públicas son force-dynamic, pero el panel sí cachea.
    revalidatePath("/admin", "layout");

    return ok(resultado);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    const t = await getTranslations("Errores");
    return fail(t("noSePudoTraducir", { detalle }));
  }
}

/* ── Borrado total ────────────────────────────────────────────────────────── */

export async function borrarTodo(
  formData: FormData
): Promise<ActionResult<ResultadoBorrado>> {
  const admin = await requireAdmin();

  const t = await getTranslations("Errores");

  const confirmacion = readString(formData.get("confirmacion"));
  if (confirmacion !== FRASE_DE_CONFIRMACION) {
    return fail(t("confirmacionExacta", { frase: FRASE_DE_CONFIRMACION }));
  }

  try {
    const resultado = await borrarTodosLosDatos(pool, admin.id);

    // El resolvedor de pulseras guarda en memoria a qué local lleva cada
    // código. Después de vaciar la base, esas entradas apuntan a locales que
    // ya no existen y hay que tirarlas.
    invalidateAll();

    revalidatePath("/admin", "layout");
    revalidatePath("/panel", "layout");

    return ok(resultado);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    return fail(t("noSePudoBorrarTodo", { detalle }));
  }
}
