import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { pool } from "@/db";
import { revisarEsquema, type InformeMigracion } from "@/lib/migraciones";
import { contarDatos } from "@/lib/reset-datos";
import { requireAdmin } from "@/lib/session";
import { formatNumber } from "@/lib/utils";
import { BorrarTodoDialog, MigrarBoton } from "./mantenimiento-client";

export const metadata = { title: "Mantenimiento · Toqia Admin" };
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

  const [esquema, datos] = await Promise.all([
    revisarEsquema(pool).catch((error: unknown) => errorDe(error)),
    contarDatos(pool, admin.id).catch((error: unknown) => errorDe(error)),
  ]);

  return (
    <>
      <PageHeader
        title="Mantenimiento"
        subtitle="Poner al día el esquema de la base y vaciarla para arrancar con datos reales."
      />

      <div className="space-y-5">
        {/* ── Esquema ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Esquema de la base</CardTitle>
            {"error" in esquema ? (
              <Badge tone="danger">no se pudo revisar</Badge>
            ) : esquema.alDia ? (
              <Badge tone="active">al día</Badge>
            ) : (
              <Badge tone="warning">
                {esquema.pendientes} cambio{esquema.pendientes === 1 ? "" : "s"} pendiente
                {esquema.pendientes === 1 ? "" : "s"}
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
                  Base <span className="font-mono text-ex-text">{esquema.base}</span>.{" "}
                  {esquema.alDia
                    ? "No falta ningún cambio: el código y la base están sincronizados."
                    : "Mientras falte un cambio, las páginas que usan esas columnas van a fallar con un error de servidor."}
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
            <CardTitle>Vaciar la base</CardTitle>
            <Badge tone="danger">irreversible</Badge>
          </CardHeader>

          <CardBody className="space-y-4">
            <p className="text-[13px] leading-relaxed text-ex-text-muted">
              Borra cuentas, locales, pulseras, camareros, escaneos, cartas y
              archivos subidos, y todos los usuarios menos el tuyo (
              <span className="font-mono text-ex-text">{admin.email}</span>). No
              hay forma de deshacerlo: si querés conservar algo, exportalo
              antes desde Escaneos.
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

function ListaDePasos({ informe }: { informe: InformeMigracion }) {
  const pendientes = informe.pasos.filter((paso) => paso.estado === "pendiente");

  return (
    <div className="rounded-control border border-ex-border bg-ex-elevated p-3">
      <p className="mb-2 text-[12px] font-semibold text-ex-text">
        Cambios que faltan
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

function TablaDeConteos({
  tablas,
  otrosUsuarios,
}: {
  tablas: Array<{ tabla: string; filas: number }>;
  otrosUsuarios: number;
}) {
  const filas = [...tablas, { tabla: "otros usuarios", filas: otrosUsuarios }];

  return (
    <div className="rounded-control border border-ex-border bg-ex-elevated p-3">
      <p className="mb-2 text-[12px] font-semibold text-ex-text">
        Lo que hay hoy en la base
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
              {formatNumber(fila.filas)}
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
