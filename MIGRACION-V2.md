# Migrar de la v1 a Toqia v2

La v1 era un redirector: restaurantes con pulseras que llevaban directo a
Google. La v2 es multi-tenant: cuentas con locales, camareros, página pública
propia y tres roles.

El esquema de base cambió bastante, así que la actualización no es solo
`git pull`.

**Si tu base de producción solo tiene datos de ejemplo del seed**, no migres:
es más simple empezar de cero (ver el final del documento).

---

## Qué le pasa a cada cosa

| v1 | v2 |
|---|---|
| `restaurant` | Una `cuenta` con un `local` adentro |
| `bracelet.destination_url` | `location.google_review_url` |
| Pulsera con un destino distinto al resto | Queda con **destino directo** cargado |
| `scan.restaurant_id` | `scan.location_id` + `scan.account_id` |
| Usuarios existentes | Pasan a rol **admin**, con su contraseña intacta |
| — | Camareros: no existían, hay que cargarlos |

Los ids se conservan, así que las URLs grabadas en los chips **siguen
funcionando igual**. No hay que regrabar ninguna pulsera.

---

## El procedimiento

Son cuatro comandos. Corrélos en orden y no saltees ninguno.

### 0. Backup

No es opcional. Es tu única vuelta atrás.

```bash
mysqldump -u USUARIO -p BASE > backup-antes-de-v2.sql
```

Con Coolify: recurso MySQL → pestaña Backups → **Backup now**, y descargalo.

### 1. Exportar los datos actuales

```bash
npm run migrate:export
```

Solo lee. Deja todo en `migracion-v1.json`. Verificá que los números que
imprime coincidan con lo que esperabas antes de seguir.

### 2. Vaciar la base

```bash
npm run migrate:reset -- --si
```

Borra las tablas viejas. Exige que exista `migracion-v1.json` con datos
adentro y que le pases `--si` explícitamente.

> **Por qué hay que borrar en vez de hacer ALTER TABLE:** `drizzle-kit push` no
> sabe transformar la tabla `bracelets` de la v1 en la de la v2 — hay una
> columna nueva que es NOT NULL y otra que desaparece. Intenta recrear la
> tabla, choca contra la clave foránea de `scans` y aborta a mitad de camino,
> dejando la base en un estado raro. Lo probé: no funciona. Borrar y recrear
> con los datos ya a salvo en el JSON es el camino limpio.

### 3. Crear el esquema nuevo

```bash
npm run db:push -- --force
```

### 4. Importar los datos

```bash
npm run migrate:import
```

---

## Después de migrar

**Revisá los destinos.** Cada local quedó con el destino que tenía la primera
de sus pulseras. Si en la v1 tenías pulseras del mismo restaurante apuntando a
lugares distintos, esas quedaron con **destino directo** cargado y saltean la
página del local. Miralas en `/admin/pulseras`: las que tienen la etiqueta
`directo`.

**Completá las páginas públicas.** Entrá a `/admin/locales` → ícono del ojo, o
pedile a cada restaurante que entre a `/panel/configuracion` y cargue su logo,
su Instagram, su WhatsApp y su menú. Sin eso, la página muestra solo el nombre
y el botón de Google.

**Creá los usuarios de restaurante.** En `/admin/usuarios`, rol *Restaurante* y
la cuenta que le corresponde. Tus usuarios viejos quedaron como admin.

**Cargá los camareros.** No existían en la v1. Los carga cada restaurante desde
`/panel/camareros`, y después asigna pulseras desde `/panel/pulseras`.

**Borrá el JSON.** `migracion-v1.json` tiene los hashes de contraseña de tus
usuarios. Cuando confirmes que todo anda:

```bash
rm migracion-v1.json
```

El `.gitignore` ya lo excluye, pero igual no lo dejes dando vueltas en el
servidor.

---

## Variables de entorno nuevas

Agregá esta al `.env` y a Coolify:

```env
# Desfase horario para los reportes. Argentina no tiene horario de verano,
# así que -3 fijo es correcto todo el año.
APP_UTC_OFFSET_HOURS="-3"
```

Sin ella se asume -3 igual, pero conviene dejarlo explícito.

---

## Si preferís empezar de cero

Si lo que hay en producción son los restaurantes de ejemplo del seed, es más
rápido y más limpio:

```bash
npm run migrate:reset -- --si    # necesita el export igual, como red de seguridad
npm run db:push -- --force
npm run db:seed
```

El seed de la v2 crea un admin, un distribuidor, dos cuentas de ejemplo (una
con dos locales), camareros, pulseras y 400 escaneos con conversiones, así que
podés probar los tres paneles enseguida.

Las credenciales que imprime al terminar son de desarrollo: cambialas antes de
dejar eso en un dominio público.

---

## Verificado

El procedimiento completo se probó contra una base con el esquema v1 cargado
con restaurantes activos e inactivos, pulseras con destinos distintos entre sí,
escaneos y un usuario con su credencial. Después de los cuatro pasos:

- Las tres cuentas y sus tres locales quedaron creados, con el destino correcto
- La pulsera que apuntaba a otro lado quedó con `override_url`
- Los cuatro escaneos conservaron su fecha y quedaron atribuidos a su cuenta
- El hash de contraseña del usuario sobrevivió intacto
- La app levanta contra la base migrada: la landing renderiza, y las pulseras
  de una cuenta dada de baja muestran "Esta pulsera no está activa"
