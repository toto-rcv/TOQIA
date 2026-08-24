# Poner al día la base

## En desarrollo

Un solo comando, siempre el mismo, después de cada `git pull`:

```powershell
npm run migrate
```

Para ver qué falta sin tocar nada:

```powershell
npm run migrate -- --dry-run
```

Después, si querés datos de prueba:

```powershell
npm run db:seed
```

Eso es todo. Es idempotente: podés correrlo dos veces sin romper nada.

## En producción

**Panel de administración → Mantenimiento.** La página muestra si falta algún
cambio y cuál, y un botón lo aplica. Es la misma rutina que corre `npm run
migrate` (vive en `src/lib/migraciones.ts`; el script de consola es solo una
cáscara).

Existe porque en el contenedor de producción no hay terminal a mano y `tsx` es
una dependencia de desarrollo que puede no estar instalada. El síntoma de una
base sin migrar es siempre el mismo: la página que usa la columna nueva tira
`Application error: a server-side exception has occurred`.

---

## Por qué no se usa `npm run db:push` para esto

Si lo corrés sobre una base que ya tiene datos, drizzle-kit muestra esto:

```
truncate table locations;
...
Error: Cannot truncate a table referenced in a foreign key constraint
       (`pulseras`.`bracelets`, CONSTRAINT `bracelets_location_id_locations_id_fk`)
```

La etapa A convirtió seis columnas de `locations` de `varchar(2048)` a `TEXT`
(por el límite de 65535 bytes por fila de InnoDB — ver el comentario en
`src/db/schema.ts`). Ante **cualquier** cambio de tipo de columna, `db:push`
emite un `TRUNCATE` preventivo de esa tabla antes de tocarla.

Ese truncate falla siempre, porque MySQL no deja truncar una tabla referenciada
por una foreign key. Y **menos mal que falla**: si funcionara, borraría todos
los locales, y en cascada las pulseras y los escaneos.

El problema es que `db:push` aborta ahí, con lo cual tampoco aplica el resto de
los cambios. Por eso la app sigue tirando `Unknown column 'bracelets.device_type'`
aunque el comando "corrió".

En MySQL, pasar de `varchar` a `TEXT` conserva los datos. No hace falta truncar
nada: el script hace las conversiones a mano, una por una.

---

## Qué hace exactamente

| Paso | Cambio |
|---|---|
| 1 | Crea `menu_categories` y `menu_items` con sus foreign keys e índices |
| 1b | Crea `media_files`, donde viven los logos, fotos y PDF que sube cada local |
| 2 | Agrega `bracelets.device_type` (`pulsera` / `placa`, por defecto `pulsera`) |
| 3 | Agrega a `locations`: `cover_image_url`, `phone`, `reservation_url`, `welcome_kicker`, `welcome_title`, `closing_message`, `closing_image_url`, `currency` |
| 4 | Convierte a `TEXT`: `logo_url`, `google_review_url`, `instagram_url`, `website_url`, `menu_url`, `maps_url` |
| 5 | Pone `DEFAULT CURRENT_TIMESTAMP` en los `created_at` / `updated_at` que no lo tenían |
| 6 | Agrega `locations.menu_header_image_url` (la imagen que encabeza la carta) |
| 6b | Agrega `menu_categories.icon` (el ícono de cada categoría) |
| 7 | Agrega `locations.menu_mode` y **congela la elección de cada local**: el que tenía PDF y ninguna carta cargada en Toqia queda en `pdf`, el resto en `toqia`. Así ningún local se queda sin el botón “Ver menú” el día que se sube el cambio. |

Antes de cada cambio consulta `information_schema` y saltea lo que ya está
aplicado. La salida te dice qué hizo y qué encontró hecho:

```
Columnas nuevas
  ✓ bracelets.device_type
  · locations.phone (ya estaba)
```

Ningún paso borra ni reescribe filas.

---

## En producción, desde tu máquina

La forma recomendada es el botón de **Mantenimiento** (arriba). Si preferís
hacerlo desde la consola apuntando a la base de Coolify, es el paso 5 del
`DEPLOY.md` cambiando el comando:

```powershell
Copy-Item .env .env.local.bak -ErrorAction SilentlyContinue
Copy-Item .env.produccion .env -Force

npm run migrate

Copy-Item .env.local.bak .env -Force
Remove-Item .env.local.bak
```

> **Hacé un backup antes.** En el recurso MySQL de Coolify, pestaña **Backups**,
> botón de backup manual. La migración no borra nada, pero un backup antes de
> tocar el esquema de producción cuesta un minuto y evita una noche mala.

Acordate de volver a desactivar **Make it publicly available** cuando termines.

---

## Vaciar la base para arrancar con datos reales

**Panel de administración → Mantenimiento → Vaciar la base.** Borra cuentas,
locales, pulseras, camareros, escaneos, cartas y archivos subidos, y todos los
usuarios menos el admin que aprieta el botón. Hay que escribir `BORRAR TODO`
para confirmar, el servidor vuelve a verificar el rol y la frase, y todo va en
una transacción: si algo falla a mitad de camino no queda media base borrada.

Es irreversible. Los contadores `AUTO_INCREMENT` vuelven a 1 para que los datos
reales arranquen desde el uno.

---

## Si la base está vacía

No hace falta nada de esto: `npm run db:push -- --force` crea todo el esquema
de cero sin conflictos, porque no hay filas que truncar.
