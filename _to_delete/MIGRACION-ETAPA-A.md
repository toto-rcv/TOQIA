# Migrar una base existente a la etapa A

La etapa A agrega la carta digital, el tipo de dispositivo (pulsera / placa) y
los campos de branding de la landing pública.

Si tu base **ya tiene datos** (locales, pulseras, escaneos), el comando es uno:

```powershell
npm run migrate:etapa-a
```

Después, si querés datos de prueba:

```powershell
npm run db:seed
```

Eso es todo. El script es idempotente: podés correrlo dos veces sin romper nada.

---

## Por qué no se usa `npm run db:push` para esto

Si lo corrés sobre una base que ya tiene datos, drizzle-kit muestra esto:

```
truncate table locations;
...
Error: Cannot truncate a table referenced in a foreign key constraint
       (`pulseras`.`bracelets`, CONSTRAINT `bracelets_location_id_locations_id_fk`)
```

La etapa A convierte seis columnas de `locations` de `varchar(2048)` a `TEXT`
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
| 2 | Agrega `bracelets.device_type` (`pulsera` / `placa`, por defecto `pulsera`) |
| 3 | Agrega a `locations`: `cover_image_url`, `phone`, `reservation_url`, `welcome_kicker`, `welcome_title`, `closing_message`, `closing_image_url`, `currency` |
| 4 | Convierte a `TEXT`: `logo_url`, `google_review_url`, `instagram_url`, `website_url`, `menu_url`, `maps_url` |
| 5 | Pone `DEFAULT CURRENT_TIMESTAMP` en los `created_at` / `updated_at` que no lo tenían |

Antes de cada cambio consulta `information_schema` y saltea lo que ya está
aplicado. La salida te dice qué hizo y qué encontró hecho:

```
Columnas nuevas
  ✓ bracelets.device_type
  · locations.phone (ya estaba)
```

Ningún paso borra ni reescribe filas.

---

## En producción

Lo mismo, apuntando a la base de Coolify. Es el paso 5 del `DEPLOY.md`, pero
cambiando el comando:

```powershell
Copy-Item .env .env.local.bak -ErrorAction SilentlyContinue
Copy-Item .env.produccion .env -Force

npm run migrate:etapa-a

Copy-Item .env.local.bak .env -Force
Remove-Item .env.local.bak
```

> **Hacé un backup antes.** En el recurso MySQL de Coolify, pestaña **Backups**,
> botón de backup manual. La migración no borra nada, pero un backup antes de
> tocar el esquema de producción cuesta un minuto y evita una noche mala.

Acordate de volver a desactivar **Make it publicly available** cuando termines.

---

## Si la base está vacía

No hace falta nada de esto: `npm run db:push -- --force` crea todo el esquema
de cero sin conflictos, porque no hay filas que truncar.
