# Despliegue en Hostinger con Coolify

Coolify construye la aplicación, corre el proceso, pone el proxy adelante y
emite el certificado HTTPS. No hay que instalar PM2 ni Caddy ni nada.

Este proyecto se despliega con el build pack **Nixpacks**, que detecta Next.js
solo. No hay Dockerfile: se sacó del repo porque no lo usamos.

> Si algún día migrás a un VPS pelado sin Coolify, la guía manual con PM2 +
> Caddy está en [DEPLOY-VPS-MANUAL.md](./DEPLOY-VPS-MANUAL.md).

---

## Antes de empezar

- Coolify instalado y funcionando en tu VPS.
- Un dominio (o subdominio) con un registro **A** apuntando a la IP del VPS:
  ```bash
  nslookup toqia.surcodes.com
  ```
  Si no devuelve la IP del servidor, esperá a que propague. Sin eso, Let's
  Encrypt no puede emitir el certificado.
- El proyecto subido a un repositorio Git. Coolify despliega desde ahí.

### Confirmá que el `.env` no está en el repo

```powershell
git ls-files | Select-String "^\.env$"
```

No tiene que devolver nada. Si aparece, sacalo con `git rm --cached .env`,
volvé a commitear, y **rotá los secretos** — un secreto que pasó por un repo se
considera quemado.

---

## 1. Crear la base de datos

En Coolify: tu proyecto → **+ New** → **Database** → **MySQL 8**.

Anotá usuario, contraseña, nombre de la base y el **host interno** (algo tipo
`mysql-abc123`). Ese host interno es el que usa la app: los dos contenedores
viven en la misma red y no necesitan salir a internet para hablarse.

Dale **Start** y esperá a que quede en verde.

> No hace falta exponer la base a internet para el funcionamiento normal. Solo
> la vas a abrir un rato para crear las tablas, y después la volvés a cerrar.

---

## 2. Crear la aplicación

**+ New** → **Application** → tu proveedor de Git → el repositorio y la rama
`main`.

| Campo | Valor |
|---|---|
| **Build Pack** | `nixpacks` |
| **Is it a static site?** | No |
| **Ports Exposes** | `3000` |
| **Base Directory** | `/` |

> **Si ya tenías la aplicación creada con Build Pack `Dockerfile`, cambialo a
> `nixpacks` antes del próximo deploy.** El Dockerfile ya no está en el repo y
> el build fallaría buscándolo.

Nixpacks detecta Next.js, corre `npm ci` y `npm run build`, y arranca con
`npm run start`.

---

## 3. Variables de entorno

Pestaña **Environment Variables**. Mirá con atención la columna
**Build Variable**.

| Variable | Valor | Build Variable |
|---|---|:---:|
| `DATABASE_URL` | `mysql://USUARIO:PASS@HOST_INTERNO:3306/BASE` | ✗ |
| `BETTER_AUTH_SECRET` | generá uno nuevo (ver abajo) | ✗ |
| `BETTER_AUTH_URL` | `https://toqia.surcodes.com` | ✗ |
| `IP_HASH_SALT` | generá uno nuevo (ver abajo) | ✗ |
| `NEXT_PUBLIC_APP_URL` | `https://toqia.surcodes.com` | **✓** |
| `REDIRECT_CACHE_TTL_SECONDS` | `60` | ✗ |
| `APP_UTC_OFFSET_HOURS` | `-3` | ✗ |
| `NODE_ENV` | `production` | ✗ |

Generá los secretos en tu máquina:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # BETTER_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # IP_HASH_SALT
```

> **No reutilices los del `.env` local.** Los de desarrollo son para desarrollo.

### Por qué `NEXT_PUBLIC_APP_URL` va como Build Variable

Todo lo que empieza con `NEXT_PUBLIC_` **se hornea dentro del bundle durante el
build**, no se lee en runtime. Si la dejás solo como variable de runtime, el
panel muestra las URLs para grabar en los chips apuntando a `localhost`, y vas a
grabar veinte pulseras inservibles.

Si cambiás el dominio más adelante, no alcanza con editar la variable: hay que
**redeployar** para que se hornee de nuevo.

### Cuidado con la contraseña en `DATABASE_URL`

Si la contraseña que generó Coolify tiene caracteres especiales (`@`, `:`, `/`,
`#`, `?`), hay que escaparlos o la conexión falla de forma confusa:

```powershell
node -e "console.log(encodeURIComponent('LA_CONTRASEÑA'))"
```

Si te resulta más simple, cambiá la contraseña de la base por una alfanumérica.

---

## 4. Dominio y primer deploy

En **Configuration → General → Domains**:

```
https://toqia.surcodes.com
```

Con `https://` adelante: eso le dice a Coolify que pida el certificado a Let's
Encrypt. El proxy lo emite y lo renueva solo.

Dale **Deploy**. El primer build tarda unos minutos. Mirá los logs en vivo desde
la pestaña de deployments.

Cuando termine, el dominio responde. Todavía va a dar error de base de datos
porque las tablas no existen: eso es el paso siguiente.

---

## 5. Crear las tablas y el usuario admin

Las migraciones se corren **desde tu máquina**, apuntando a la base de Coolify.
Es el camino más seguro: usás las mismas herramientas que ya probaste en local y
ves los errores en tu propia terminal.

**a.** En el recurso MySQL de Coolify, activá **Make it publicly available** y
anotá el puerto público.

**b.** Creá un `.env.produccion` en la carpeta del proyecto:

```env
DATABASE_URL="mysql://USUARIO:PASS@IP_DEL_VPS:PUERTO_PUBLICO/BASE"
BETTER_AUTH_SECRET="el mismo que pusiste en Coolify"
BETTER_AUTH_URL="https://toqia.surcodes.com"
NEXT_PUBLIC_APP_URL="https://toqia.surcodes.com"
IP_HASH_SALT="el mismo que pusiste en Coolify"
SEED_ADMIN_EMAIL="tu-email-real@dominio.com"
SEED_ADMIN_PASSWORD="una contraseña fuerte y distinta a la de desarrollo"
SEED_ADMIN_NAME="Tu Nombre"
```

> `BETTER_AUTH_SECRET` tiene que ser **el mismo** que en Coolify: el hash de la
> contraseña del admin depende de él. Si no coincide, el usuario se crea pero no
> vas a poder entrar.

**c.** Corré las migraciones:

```powershell
Copy-Item .env .env.local.bak -ErrorAction SilentlyContinue
Copy-Item .env.produccion .env -Force

npm run db:push -- --force
npm run db:seed

Copy-Item .env.local.bak .env -Force
Remove-Item .env.local.bak
```

**d.** Volvé a Coolify y **desactivá "Make it publicly available"**. No es
opcional: una base MySQL expuesta a internet con credenciales conocidas es
cuestión de días.

**e.** Borrá el archivo con las credenciales:

```powershell
Remove-Item .env.produccion
```

---

## 6. Verificar que quedó bien

- [ ] `https://toqia.surcodes.com/login` muestra el login con candado
- [ ] Entrás con el usuario que creaste en el seed
- [ ] En **Pulseras**, la columna "URL del chip" muestra
      `https://toqia.surcodes.com/r/B001` — **no** `localhost`
- [ ] `https://toqia.surcodes.com/r/B001` muestra la página del restaurante:
      portada, logo, botón verde de reseña y los accesos
- [ ] El botón de reseña lleva a Google
- [ ] El escaneo aparece en **Escaneos** con el tilde en la columna "Reseña"
- [ ] Si el local tiene carta cargada, el botón "Ver menú" abre `/r/B001/carta`
- [ ] `/r/NOEXISTE` muestra "Pulsera no reconocida", no un error 500

Si la columna "URL del chip" dice `localhost`, `NEXT_PUBLIC_APP_URL` no llegó al
build. Revisá que tenga **Build Variable** activado y redeployá.

---

## 7. Backups

En el recurso MySQL → pestaña **Backups**:

- Frecuencia: **daily**
- Activá el envío a un **S3 compatible** si tenés dónde

> **Un backup que vive en el mismo servidor no es un backup.** Si se pierde el
> VPS, se pierden los dumps con él. Backblaze B2 o Cloudflare R2 salen unos
> centavos por mes para este volumen.

Los logos, fotos y PDF que suben los restaurantes se guardan **dentro de la
base**, en la tabla `media_files`. Eso los hace sobrevivir a cada deploy sin
montar volúmenes, y hace que el backup de la base sea un backup completo de
verdad — pero también que crezca: contá unos 2 a 5 MB por local con la carta
cargada con fotos.

---

## 8. Actualizar la app

```powershell
git add .
git commit -m "Lo que cambiaste"
git push
```

Con auto-deploy activado, Coolify redeploya solo. Si no, apretá **Deploy**.

**Si cambiaste el esquema de la base**, repetí el paso 5 (abrir la base, correr
la migración, cerrarla). Agregar columnas se puede hacer antes del deploy sin
romper nada; eliminarlas conviene después.

> ⚠️ **`db:push` solo sirve sobre una base vacía.** Si la base ya tiene datos y
> el cambio incluye una conversión de tipo de columna, drizzle-kit intenta un
> `TRUNCATE` preventivo, falla por las foreign keys y deja la migración a medias.
> Para poner al día una base con datos el comando es `npm run migrate`. Está
> explicado en [MIGRACIONES.md](./MIGRACIONES.md).

---

## Problemas frecuentes

**El deploy falla en el build.** Mirá los logs del deployment. Lo más común es
que falte `NEXT_PUBLIC_APP_URL` como Build Variable, o que el Build Pack siga en
`Dockerfile` cuando ya no hay Dockerfile en el repo.

**La app arranca y se cae sola.** Casi siempre es `DATABASE_URL`. La app corta al
arrancar con un mensaje explícito si falta una variable obligatoria: miralo en
los logs del contenedor. Si la variable está pero no conecta, revisá que estés
usando el **host interno** de Coolify y no `localhost`.

**Entra al login pero rebota al ingresar.** `BETTER_AUTH_URL` tiene que ser
exactamente el dominio con `https://`, sin barra final. Las cookies de sesión son
`secure` en producción y no viajan si el origen no coincide.

**Todos los escaneos tienen el mismo `ip_hash`.** El proxy no está pasando
`X-Forwarded-For`. Traefik lo hace por defecto en Coolify; si metiste otro proxy
adelante (Cloudflare, por ejemplo), revisá esa capa.

**Cambiar algo de la página del local tarda en verse.** Hasta 60 segundos si el
cambio no pasó por un panel. Desde el panel es inmediato, porque invalida el
caché a mano.
