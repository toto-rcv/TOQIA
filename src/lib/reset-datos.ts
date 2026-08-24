import type mysql from "mysql2/promise";

/**
 * Vaciado total de la base, conservando un único usuario administrador.
 *
 * Existe para el momento de arrancar en serio: la base viene con los datos de
 * prueba del seed y hay que dejarla limpia sin perder el acceso al panel.
 *
 * Es irreversible y no hay "deshacer". Todo lo que la usa —la página de
 * mantenimiento— pide escribir una frase de confirmación antes de llamarla.
 */

/**
 * Lo que hay que escribir para confirmar el borrado.
 *
 * Vive acá y no en el archivo de acciones porque un módulo `"use server"` solo
 * puede exportar funciones async, y porque el formulario del cliente necesita
 * la misma constante para validar antes de enviar.
 */
export const FRASE_DE_CONFIRMACION = "BORRAR TODO";

/** Tablas de datos, en orden hijo → padre. */
const TABLAS_DE_DATOS = [
  "scans",
  "menu_items",
  "menu_categories",
  "media_files",
  "bracelets",
  "waiters",
  "locations",
  "accounts",
] as const;

/**
 * El orden importa aunque las foreign keys estén en ON DELETE CASCADE: acá se
 * borra tabla por tabla para poder informar cuántas filas se fueron de cada
 * una. Si dejáramos que cascadeara, el contador diría cero en las hijas y no
 * habría forma de verificar que el borrado hizo lo que dice.
 */

export type ConteoTabla = { tabla: string; filas: number };

/** Cuántas filas hay hoy en cada tabla. Es lo que se muestra antes de borrar. */
export async function contarDatos(
  pool: mysql.Pool,
  conservarUsuarioId: string
): Promise<{ tablas: ConteoTabla[]; total: number; otrosUsuarios: number }> {
  const tablas: ConteoTabla[] = [];

  for (const tabla of TABLAS_DE_DATOS) {
    const [filas] = await pool.query<mysql.RowDataPacket[]>(
      // El nombre de tabla no puede ir como parámetro; sale de la constante de
      // arriba, nunca de la entrada del usuario.
      `SELECT COUNT(*) AS n FROM \`${tabla}\``
    );
    tablas.push({ tabla, filas: Number(filas[0]?.n ?? 0) });
  }

  const [usuarios] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM `user` WHERE id <> ?",
    [conservarUsuarioId]
  );
  const otrosUsuarios = Number(usuarios[0]?.n ?? 0);

  return {
    tablas,
    total: tablas.reduce((suma, t) => suma + t.filas, 0) + otrosUsuarios,
    otrosUsuarios,
  };
}

export type ResultadoBorrado = {
  borradas: ConteoTabla[];
  total: number;
};

/**
 * Borra todo y deja únicamente al usuario indicado.
 *
 * @param conservarUsuarioId el admin que está ejecutando la acción. Se
 *   conserva su fila en `user`, su sesión y su método de acceso; todo lo demás
 *   se va, incluidos los otros usuarios.
 */
export async function borrarTodosLosDatos(
  pool: mysql.Pool,
  conservarUsuarioId: string
): Promise<ResultadoBorrado> {
  if (!conservarUsuarioId) {
    throw new Error("Hace falta el id del usuario a conservar.");
  }

  const conexion = await pool.getConnection();
  const borradas: ConteoTabla[] = [];

  try {
    // El usuario a conservar tiene que existir y ser admin. Si no, un borrado
    // exitoso dejaría la aplicación sin ninguna forma de entrar.
    const [filas] = await conexion.query<mysql.RowDataPacket[]>(
      "SELECT role FROM `user` WHERE id = ? LIMIT 1",
      [conservarUsuarioId]
    );
    if (filas.length === 0) {
      throw new Error("El usuario a conservar no existe en la base.");
    }
    if (filas[0].role !== "admin") {
      throw new Error("El usuario a conservar tiene que ser administrador.");
    }

    await conexion.beginTransaction();

    for (const tabla of TABLAS_DE_DATOS) {
      const [resultado] = await conexion.query<mysql.ResultSetHeader>(
        `DELETE FROM \`${tabla}\``
      );
      borradas.push({ tabla, filas: resultado.affectedRows });
    }

    // Sesiones y métodos de acceso de los demás usuarios. Van antes que `user`
    // aunque cascadeen, por lo mismo que las tablas de arriba: para contarlas.
    for (const tabla of ["session", "account"] as const) {
      const [resultado] = await conexion.query<mysql.ResultSetHeader>(
        `DELETE FROM \`${tabla}\` WHERE userId <> ?`,
        [conservarUsuarioId]
      );
      borradas.push({ tabla, filas: resultado.affectedRows });
    }

    const [usuarios] = await conexion.query<mysql.ResultSetHeader>(
      "DELETE FROM `user` WHERE id <> ?",
      [conservarUsuarioId]
    );
    borradas.push({ tabla: "user", filas: usuarios.affectedRows });

    // Tokens de verificación y de recuperación: sin cuentas a las que apuntar
    // ya no sirven para nada.
    const [verificaciones] = await conexion.query<mysql.ResultSetHeader>(
      "DELETE FROM `verification`"
    );
    borradas.push({ tabla: "verification", filas: verificaciones.affectedRows });

    // El admin podía estar asignado a una cuenta que se acaba de borrar.
    await conexion.query("UPDATE `user` SET accountId = NULL WHERE id = ?", [
      conservarUsuarioId,
    ]);

    await conexion.commit();
  } catch (error) {
    // Si algo falla a mitad de camino, la base queda como estaba: media base
    // borrada sería peor que no haber borrado nada.
    try {
      await conexion.rollback();
    } catch {
      // El rollback puede fallar si se cayó la conexión; el error que importa
      // es el original, así que no lo tapamos con este.
    }
    throw error;
  } finally {
    conexion.release();
  }

  // Los AUTO_INCREMENT vuelven a 1 para que los datos reales arranquen desde
  // el uno y no desde donde quedaron los de prueba. Va fuera de la
  // transacción: un ALTER TABLE hace commit implícito en MySQL.
  for (const tabla of TABLAS_DE_DATOS) {
    try {
      await pool.query(`ALTER TABLE \`${tabla}\` AUTO_INCREMENT = 1`);
    } catch {
      // Es cosmético. Si el motor no lo permite, los datos ya se borraron y
      // eso es lo que importa: no vale la pena hacer fallar toda la operación.
    }
  }

  return {
    borradas,
    total: borradas.reduce((suma, t) => suma + t.filas, 0),
  };
}
