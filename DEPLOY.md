# Despliegue en Hostinger con Coolify

Coolify se encarga de construir la imagen, correr el contenedor, poner el proxy
adelante y emitir el certificado HTTPS. Vos no instalás PM2 ni Caddy ni nada:
todo eso ya lo hace él.

Este proyecto trae el `Dockerfile` listo, así que el build es determinista y no
depende de que Nixpacks adivine bien.

> Si algún día migrás a un VPS pelado sin Coolify, la guía manual con PM2 +
> Caddy está en [DEPLOY-VPS-MANUAL.md](./DEPLOY-VPS-MANUAL.md).

---

## Antes de empezar

- Coolify ya instalado y funcionando en tu VPS de Hostinger.
- Un dominio (o subdominio) con un registro **A** apuntando a la IP del VPS.
  Verificalo antes de seguir:
  ```bash
  nslookup pulseras.midominio.com
  ```
  Si no devuelve la IP del servidor, esperá a que propague. Sin eso, Let's
  Encrypt no puede emitir el certificado.
- El proyecto subido a un repositorio Git (GitHub, GitLab o el que uses).
  Coolify despliega desde ahí.

### Subir el proyecto al repo

Desde tu máquina, parado en la carpeta del proyecto:

```powershell
git init
git add .
git commit -m "Sistema de pulseras NFC"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pulseras-nfc.git
git push -u origin main
```

El `.gitignore` ya excluye el `.env`, `node_modules` y `.next`. **Confirmá que
el `.env` no se subió** antes de seguir:

```powershell
git ls-files | Select-String "^\.env$"
```

No tiene que devolver nada. Si aparece, sacalo con `git rm --cached .env`,
volvé a commitear, y **rotá los secretos** — un secreto que pasó por un repo se
considera quemado.

---

## 1. Crear la base de datos

En Coolify: tu proyecto → **+ New** → **Database** → **MySQL 8**.

Anotá lo que te muestra en la pestaña de configuración: usuario, contraseña,
nombre de la base y el **host interno** (algo tipo `mysql-abc123`). Ese host
interno es el que va a usar la app, porque los dos contenedores viven en la
misma red de Docker y no necesitan salir a internet para hablarse.

Dale **Start** y esperá a que quede en verde.

> **No hace falta exponer la base a internet** para el funcionamiento normal.
> Solo la vas a abrir un rato en el paso 5, para crear las tablas, y después la
> volvés a cerrar.

---

## 2. Crear la aplicación

En el mismo proyecto: **+ New** → **Application** → tu proveedor de Git → elegí
el repositorio y la rama `main`.

En la configuración:

| Campo | Valor |
|---|---|
| **Build Pack** | `Dockerfile` |
| **Dockerfile Location** | `/Dockerfile` |
| **Ports Exposes** | `3000` |
| **Base Directory** | `/` |

El `Dockerfile` del repo hace el build multi-etapa y deja corriendo el server
standalone de Next como usuario sin privilegios.

---

## 3. Variables de entorno

Pestaña **Environment Variables** de la aplicación. Esta tabla es lo más
importante de toda la guía: **fijate en la columna "Build Variable"**.

| Variable | Valor | Build Variable |
|---|---|:---:|
| `DATABASE_URL` | `mysql://USUARIO:PASS@HOST_INTERNO:3306/BASE` | ✗ |
| `BETTER_AUTH_SECRET` | generá uno nuevo (ver abajo) | ✗ |
| `BETTER_AUTH_URL` | `https://pulseras.midominio.com` | ✗ |
| `IP_HASH_SALT` | generá uno nuevo (ver abajo) | ✗ |
| `NEXT_PUBLIC_APP_URL` | `https://pulseras.midominio.com` | **✓** |
| `REDIRECT_CACHE_TTL_SECONDS` | `60` | ✗ |
| `NODE_ENV` | `production` | ✗ |

Generá los dos secretos en tu máquina y pegalos:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # BETTER_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # IP_HASH_SALT
```

> **No reutilices los del `.env` local.** Los de desarrollo son para desarrollo.

### Por qué `NEXT_PUBLIC_APP_URL` va como Build Variable

Todo lo que empieza con `NEXT_PUBLIC_` **se hornea dentro del bundle durante el
build**, no se lee en runtime. Si la dejás solo como variable de runtime, el
panel te va a mostrar las URLs para grabar en los chips apuntando a
`http://localhost:3000`, y vas a grabar veinte pulseras inservibles.

Si más adelante cambiás el dominio, no alcanza con editar la variable: hay que
**redeployar** para que se hornee de nuevo.

### Cuidado con la contraseña en `DATABASE_URL`

Si la contraseña que generó Coolify tiene caracteres especiales (`@`, `:`, `/`,
`#`, `?`), hay que escaparlos en la URL o la conexión falla de forma confusa.
Convertila así:

```powershell
node -e "console.log(encodeURIComponent('LA_CONTRASEÑA'))"
```

Y usá el resultado en la cadena. Si te resulta más simple, cambiá la contraseña
de la base por una alfanumérica sin símbolos.

---

## 4. Dominio y primer deploy

En **Configuration → General → Domains**, poné:

```
https://pulseras.midominio.com
```

Con `https://` adelante: eso le dice a Coolify que pida el certificado a Let's
Encrypt. El proxy (Traefik) lo emite y lo renueva solo.

Dale **Deploy**. El primer build tarda unos minutos porque baja las
dependencias. Mirá los logs en vivo desde la pestaña de deployments.

Cuando termine, `https://pulseras.midominio.com` te tiene que responder. Todavía
va a dar error de base de datos, porque las tablas no existen: eso es el paso
siguiente.

---

## 5. Crear las tablas y el usuario admin

Las migraciones se corren **desde tu máquina**, apuntando a la base de Coolify.
Es el camino más seguro: usás las mismas herramientas que ya probaste en local y
ves los errores en tu propia terminal.

**a. Abrí la base temporalmente.** En el recurso MySQL de Coolify, activá
**Make it publicly available** y anotá el puerto público que te asigna.

**b. Desde tu máquina**, creá un archivo `.env.produccion` en la carpeta del
proyecto con la conexión pública:

```env
DATABASE_URL="mysql://USUARIO:PASS@IP_DEL_VPS:PUERTO_PUBLICO/BASE"
BETTER_AUTH_SECRET="el mismo que pusiste en Coolify"
BETTER_AUTH_URL="https://pulseras.midominio.com"
NEXT_PUBLIC_APP_URL="https://pulseras.midominio.com"
IP_HASH_SALT="el mismo que pusiste en Coolify"
SEED_ADMIN_EMAIL="tu-email-real@dominio.com"
SEED_ADMIN_PASSWORD="una contraseña fuerte y distinta a la de desarrollo"
SEED_ADMIN_NAME="Tu Nombre"
```

> `BETTER_AUTH_SECRET` tiene que ser **el mismo** que en Coolify: el hash de la
> contraseña del admin depende de él. Si no coincide, el usuario se crea pero no
> vas a poder entrar.

**c. Corré las migraciones y creá el admin:**

```powershell
$env:DOTENV_CONFIG_PATH=".env.produccion"
Copy-Item .env .env.local.bak -ErrorAction SilentlyContinue
Copy-Item .env.produccion .env -Force

npm run db:push -- --force
npm run db:seed

Copy-Item .env.local.bak .env -Force
Remove-Item .env.local.bak
```

El seed crea el usuario admin, dos restaurantes de ejemplo y datos de prueba. En
producción vas a querer borrar los restaurantes de ejemplo desde el panel una
vez que entres — al borrarlos se borran sus pulseras y escaneos en cascada.

**d. Cerrá la base.** Volvé a Coolify y **desactivá "Make it publicly
available"**. Este paso no es opcional: una base MySQL expuesta a internet con
credenciales conocidas es cuestión de días.

**e. Borrá el archivo con las credenciales:**

```powershell
Remove-Item .env.produccion
```

> Alternativa sin exponer la base: Coolify tiene una terminal web hacia el
> contenedor. Sirve, pero la imagen de producción no incluye `drizzle-kit`
> (es una dependencia de desarrollo), así que tendrías que instalarlo ahí
> adentro. Por eso recomiendo el camino de arriba.

---

## 6. Verificar que quedó bien

- [ ] `https://pulseras.midominio.com/admin` muestra el login con candado
- [ ] Entrás con el usuario que creaste en el seed
- [ ] En **Pulseras**, la columna "URL del chip" muestra
      `https://pulseras.midominio.com/r/B001` — **no** `localhost`
- [ ] `https://pulseras.midominio.com/r/B001` redirige a Google
- [ ] El escaneo aparece en **Escaneos** con una IP hasheada, no en claro
- [ ] Cambiás el destino de una pulsera y el redirect cambia al instante
- [ ] `/r/NOEXISTE` muestra "Pulsera no reconocida", no un error 500
- [ ] Una pulsera desactivada muestra "Esta pulsera no está activa"

Si la columna "URL del chip" dice `localhost`, `NEXT_PUBLIC_APP_URL` no llegó al
build. Revisá que tenga **Build Variable** activado y redeployá.

---

## 7. Backups

Coolify los hace por vos. En el recurso MySQL → pestaña **Backups**:

- Frecuencia: **daily** (o el cron que prefieras)
- Activá el envío a un **S3 compatible** si tenés dónde

> **Un backup que vive en el mismo servidor no es un backup.** Si se pierde el
> VPS, se pierden los dumps con él. Configurá el destino S3 — Backblaze B2 o
> Cloudflare R2 salen unos centavos por mes para este volumen de datos.

El script `scripts/backup-mysql.sh` del repo es para el despliegue manual. Con
Coolify no lo necesitás.

---

## 8. Actualizar la app

```powershell
git add .
git commit -m "Lo que cambiaste"
git push
```

Si tenés el auto-deploy activado, Coolify redeploya solo con el push. Si no,
apretá **Deploy** en el panel.

**Si cambiaste el esquema de la base**, repetí el paso 5 (abrir la base, correr
`db:push`, cerrarla) antes o después del deploy según el cambio: agregar
columnas nuevas se puede hacer antes sin romper nada; eliminar columnas conviene
hacerlo después.

---

## Problemas frecuentes

**El deploy falla en el build.** Mirá los logs del deployment. Lo más común es
que falte `NEXT_PUBLIC_APP_URL` como Build Variable.

**La app arranca y se cae sola.** Casi siempre es `DATABASE_URL`. La app corta
al arrancar con un mensaje explícito si falta una variable obligatoria: miralo
en los logs del contenedor. Si la variable está pero no conecta, revisá que
estés usando el **host interno** de Coolify y no `localhost`.

**Entra al login pero rebota al intentar ingresar.** `BETTER_AUTH_URL` tiene que
ser exactamente el dominio con `https://`, sin barra final. Las cookies de
sesión son `secure` en producción y no viajan si el origen no coincide.

**Todos los escaneos tienen el mismo `ip_hash`.** El proxy no está pasando
`X-Forwarded-For`. Traefik lo hace por defecto en Coolify; si metiste un proxy
adicional adelante (Cloudflare, por ejemplo), revisá esa capa.

**Cambiar el destino tarda en verse.** Hasta 60 segundos es el comportamiento
esperado si el cambio no pasó por el panel (por ejemplo, si tocaste la base
directo). Desde el panel es inmediato, porque invalida el caché a mano.
