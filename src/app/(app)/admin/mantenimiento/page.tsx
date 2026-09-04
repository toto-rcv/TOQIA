import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { pool } from "@/db";
import { revisarEsquema, type InformeMigracion } from "@/lib/migraciones";
import { contarDatos } from "@/lib/reset-datos";
import { requireAdmin } from "@/lib/session";
import { formatNumber } from "@/lib/utils";
import { BorrarTodoDialog, MigrarBoton } from "./mantenimiento-client";

/**
 * El título de la pestaña también viaja por las traducciones: el panel está en
 * siete idiomas y la pestaña es lo primero que se lee al volver a la ventana.
 */
export async function generateMetadata() {
  const t = await getTranslations("Mantenimiento");
  return { title: t("titulo") };
}
export const dynamic = "force-dynamic";

/**
 * Mantenimiento de la base.
 *
 * Dos herramientas que antes solo existían por línea de comandos y que en
 * producción no se podían usar: no hay terminal en el contenedor y `tsx` es
 * una dependencia de desarrollo que puede no estar instalada.
 *
 * La página se banca que la base esté a medio migrar: cada bloque atrapa su
 * propio error y muestra qué pasó, en vez de tumbar toda la pantalla. Es
 * justamente el estado en el que uno viene a buscarla.
 */
export default async function MantenimientoPage() {
  const admin = await requireAdmin();
  const t = await getTranslations("Mantenimiento");

  const [esquema, datos] = await Promise.all([
    revisarEsquema(pool).catch((error: unknown) => errorDe(error)),
    contarDatos(pool, admin.id).catch((error: unknown) => errorDe(error)),
  ]);

  return (
    <>
      <PageHeader
        title={t("titulo")}
        subtitle={t("subtitulo")}
      />

      <div className="space-y-5">
        {/* ── Esquema ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("esquema")}</CardTitle>
            {"error" in esquema ? (
              <Badge tone="danger">{t("noSePudoRevisar")}</Badge>
            ) : esquema.alDia ? (
              <Badge tone="active">{t("alDia")}</Badge>
            ) : (
              <Badge tone="warning">
                {t("pendientes", { n: esquema.pendientes })}
              </Badge>
            )}
          </CardHeader>

          <CardBody className="space-y-4">
            {"error" in esquema ? (
              <p className="text-[13px] leading-relaxed text-ex-danger">
                {esquema.error}
              </p>
            ) : (
              <>
                <p className="text-[13px] leading-relaxed text-ex-text-muted">
                  {t.rich("baseNombre", {
                    base: () => (
                      <span className="font-mono text-ex-text">
                        {esquema.base}
                      </span>
                    ),
                  })}{" "}
                  {esquema.alDia ? t("sincronizada") : t("faltanCambios")}
                </p>

                {esquema.pendientes > 0 ? (
                  <ListaDePasos informe={esquema} />
                ) : null}

                <MigrarBoton alDia={esquema.alDia} />
              </>
            )}
          </CardBody>
        </Card>

        {/* ── Borrado ──────────────────────────────────────────────────── */}
        <Card className="border-ex-danger/25">
          <CardHeader>
            <CardTitle>{t("vaciarLaBase")}</CardTitle>
            <Badge tone="danger">{t("irreversible")}</Badge>
          </CardHeader>

          <CardBody className="space-y-4">
            <p className="text-[13px] leading-relaxed text-ex-text-muted">
              {t.rich("vaciarDesc", {
                email: () => (
                  <span className="font-mono text-ex-text">{admin.email}</span>
                ),
              })}
            </p>

            {"error" in datos ? (
              <p className="text-[13px] leading-relaxed text-ex-danger">
                {datos.error}
              </p>
            ) : (
              <>
                <TablaDeConteos
                  tablas={datos.tablas}
                  otrosUsuarios={datos.otrosUsuarios}
                />
                <BorrarTodoDialog total={datos.total} email={admin.email} />
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/* ── Piezas ───────────────────────────────────────────────────────────────── */

async function ListaDePasos({ informe }: { informe: InformeMigracion }) {
  const t = await getTranslations("Mantenimiento");
  const pendientes = informe.pasos.filter((paso) => paso.estado === "pendiente");

  return (
    <div className="rounded-control border border-ex-border bg-ex-elevated p-3">
      <p className="mb-2 text-[12px] font-semibold text-ex-text">
        {t("cambiosQueFaltan")}
      </p>
      <ul className="space-y-1">
        {pendientes.map((paso, i) => (
          <li
            key={`${paso.grupo}-${paso.descripcion}-${i}`}
            className="flex gap-2 text-[12px] text-ex-text-secondary"
          >
            <span className="text-ex-warning">→</span>
            <span className="min-w-0">
              <span className="font-mono">{paso.descripcion}</span>
              <span className="text-ex-text-disabled"> · {paso.grupo}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function TablaDeConteos({
  tablas,
  otrosUsuarios,
}: {
  tablas: Array<{ tabla: string; filas: number }>;
  otrosUsuarios: number;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("Mantenimiento"),
    getLocale(),
  ]);
  const filas = [...tablas, { tabla: t("otrosUsuarios"), filas: otrosUsuarios }];

  return (
    <div className="rounded-control border border-ex-border bg-ex-elevated p-3">
      <p className="mb-2 text-[12px] font-semibold text-ex-text">
        {t("loQueHayHoy")}
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {filas.map((fila) => (
          <li
            key={fila.tabla}
            className="flex items-baseline justify-between gap-2 text-[12px]"
          >
            <span className="truncate font-mono text-ex-text-secondary">
              {fila.tabla}
            </span>
            <span
              className={
                "num shrink-0 tabular-nums " +
                (fila.filas > 0 ? "text-ex-text" : "text-ex-text-disabled")
              }
            >
              {formatNumber(fila.filas, locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Convierte cualquier error en algo que la página pueda mostrar sin caerse. */
function errorDe(error: unknown): { error: string } {
  return { error: error instanceof Error ? error.message : String(error) };
}
