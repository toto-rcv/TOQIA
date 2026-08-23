# Pulseras NFC

Sistema de captación de reseñas de Google para restaurantes mediante pulseras NFC.

Cada pulsera tiene grabada una URL fija con su código (`https://midominio.com/r/B001`).
Cuando un cliente apoya el celular, el sistema busca a qué restaurante pertenece,
registra el escaneo y lo redirige al destino configurado en ese momento.

**El destino se cambia desde el panel y no hace falta regrabar el chip.** Por eso
la pulsera nunca apunta directo a Google: apunta al endpoint propio, que resuelve
el destino en tiempo real.

---

## Stack

| Pieza | Qué se usa |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Base de datos | MySQL 8 (InnoDB, utf8mb4) |
| ORM | Drizzle ORM + driver `mysql2` |
| Estilos | Tailwind CSS + componentes propios sobre Radix |
| Autenticación | Better Auth (email + contraseña, sin registro público) |
| Gráficos | Recharts |

Sin servicios externos pagos. Todo corre en un VPS propio.

---

## Puesta en marcha local

Necesitás **Node 20 o superior** y un **MySQL 8** corriendo en tu máquina.

> **Atajo en Windows:** si ya tenés MySQL instalado, corré `setup.ps1` y saltá
> directo a "Arrancar". El script crea la base y el usuario, deja el servidor en
> UTC, genera el `.env` con secretos nuevos, instala dependencias, crea las
> tablas y carga los datos de ejemplo:
>
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\setup.ps1
> ```

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar el entorno

```bash
cp .env.example .env
```

Generá los dos secretos con Node, que ya lo tenés instalado:

```bash
# BETTER_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# IP_HASH_SALT
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Crear la base y el usuario

Desde el cliente de MySQL:

```sql
CREATE DATABASE toqia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'toqia'@'localhost' IDENTIFIED BY 'toqia';
CREATE USER 'toqia'@'127.0.0.1' IDENTIFIED BY 'toqia';
GRANT ALL PRIVILEGES ON toqia.* TO 'toqia'@'localhost';
GRANT ALL PRIVILEGES ON toqia.* TO 'toqia'@'127.0.0.1';
FLUSH PRIVILEGES;

SET PERSIST time_zone = '+00:00';
```

Se crean los dos usuarios porque MySQL trata `localhost` y `127.0.0.1` como
hosts distintos según cómo resuelva la conexión.

`SET PERSIST` es importante: la app guarda todo en UTC y varias columnas usan
`CURRENT_TIMESTAMP` por defecto, así que con el servidor en hora local esas
fechas quedan corridas. A diferencia de `SET GLOBAL`, `PERSIST` sobrevive a los
reinicios del servicio.

Ajustá `DATABASE_URL` en el `.env` con el usuario, la contraseña y la base que
hayas creado.

### 4. Crear las tablas

```bash
npm run db:push
```

Esto aplica el esquema de `src/db/schema.ts` directamente contra la base. Para un
flujo con archivos de migración versionados, usá `npm run db:generate` seguido de
`npm run db:migrate`.

> **`db:push` es para una base vacía.** Si la base ya tiene datos y el cambio de
> esquema incluye una conversión de tipo de columna, drizzle-kit intenta un
> `TRUNCATE` preventivo, falla por las foreign keys y deja la migración a medias.
> Para subir una base con datos de la v2 a la etapa A, el comando es
> `npm run migrate` — ver [MIGRACIONES.md](./MIGRACIONES.md).

### 5. Cargar datos de ejemplo

```bash
npm run db:seed
```

Crea el usuario admin, dos restaurantes, cinco pulseras cada uno y unos 200
escaneos repartidos en los últimos 30 días para que el dashboard tenga algo que
mostrar.

Credenciales por defecto (se configuran en el `.env`):

```
admin@pulseras.local / admin1234
```

### 6. Arrancar

```bash
npm run dev
```

- Panel: http://localhost:3000/admin
- Prueba de redirección: http://localhost:3000/r/B001

`npm run dev` usa Turbopack, que en Windows compila varias veces más rápido que
webpack. Si alguna vez sospechás del compilador, `npm run dev:webpack` arranca lo
mismo con el motor viejo.

> **En Windows, agregá la carpeta del proyecto a las exclusiones de Microsoft
> Defender** (Seguridad de Windows → Protección antivirus → Exclusiones →
> Agregar carpeta). Defender escanea cada uno de los miles de archivos de
> `node_modules` en cada compilación, y es la causa más común de que el
> desarrollo local vaya lento.

---

## Probar el escaneo real desde el celular

Esta es la única prueba que importa de verdad: grabar una pulsera y escanearla.
Hay dos caminos.

### Opción A — red local (rápida, sin cuentas)

Sirve si la computadora y el celular están en el mismo WiFi.

**1. Averiguá la IP de tu máquina en la LAN**

```bash
# Windows
ipconfig
# buscá "Dirección IPv4" del adaptador WiFi, algo como 192.168.0.15

# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

**2. Poné esa IP en el `.env`**

```env
NEXT_PUBLIC_APP_URL="http://192.168.0.15:3000"
BETTER_AUTH_URL="http://192.168.0.15:3000"
```

Esto es lo que hace que el panel muestre la URL correcta para grabar en el chip.

**3. Arrancá escuchando en todas las interfaces**

```bash
npm run dev:lan
```

Por defecto Next escucha solo en `localhost` y el celular no lo alcanza. El script
`dev:lan` agrega `-H 0.0.0.0`.

**4. Permitilo en el firewall**

En Windows, la primera vez salta un cartel de Windows Defender: marcá **Redes privadas**
y aceptá. Si no aparece, abrí el puerto a mano en PowerShell como administrador:

```powershell
New-NetFirewallRule -DisplayName "Next dev 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private
```

**5. Verificá desde el celular**

Abrí `http://192.168.0.15:3000/r/B001` en el navegador del celular. Tiene que
redirigirte a Google.

**6. Grabá la pulsera**

Con una app de escritura NFC (**NFC Tools** en Android o iOS, o **NXP TagWriter** en
Android):

1. Nuevo registro → *Link / URL*
2. Pegá `http://192.168.0.15:3000/r/B001` (copialo desde el panel con el botón de copiar)
3. Escribir en el tag y apoyar el celular sobre la pulsera

Apoyá el celular de nuevo: se abre el navegador solo y redirige. Después mirá
`/admin/scans`, el escaneo tiene que estar registrado.

> **Limitación:** iPhone solo lee automáticamente tags con URLs `https` en algunas
> configuraciones, y algunos Android muestran un aviso extra con `http`. Si el
> escaneo automático no dispara, probá la opción B.

### Opción B — túnel público con HTTPS

Más fiel a producción, porque te da HTTPS real. Necesitás una cuenta gratuita de
Cloudflare o de ngrok.

```bash
# Con cloudflared
cloudflared tunnel --url http://localhost:3000

# Con ngrok
ngrok http 3000
```

Cualquiera de los dos te devuelve una URL tipo `https://algo-random.trycloudflare.com`.
Poné esa URL en el `.env`:

```env
NEXT_PUBLIC_APP_URL="https://algo-random.trycloudflare.com"
BETTER_AUTH_URL="https://algo-random.trycloudflare.com"
```

Reiniciá `npm run dev` y grabá la pulsera con `https://algo-random.trycloudflare.com/r/B001`.

> La URL del túnel cambia cada vez que lo reiniciás (en los planes gratuitos), así
> que sirve para probar pero no para grabar pulseras definitivas.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en localhost (Turbopack) |
| `npm run dev:lan` | Servidor de desarrollo accesible desde la red local |
| `npm run dev:webpack` | Igual que `dev` pero con webpack, por si Turbopack falla |
| `npm run build` | Build de producción (modo standalone) |
| `npm run start` | Arranca el build de producción |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm run db:push` | Aplica el esquema a la base |
| `npm run db:generate` | Genera archivos de migración |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:studio` | Abre Drizzle Studio para explorar la base |
| `npm run db:seed` | Carga los datos de ejemplo |
| `npm run migrate` | Pone al día una base que ya tiene datos |
| `npm run test:media` | Prueba el subsistema de archivos contra la base |

---

## Los tres ambientes visuales

| Prefijo | Dónde | Qué es |
|---|---|---|
| `ex-*` | `/admin`, `/panel`, `/distribuidor` | Panel claro tipo SaaS: lienzo lavanda, tarjetas blancas redondeadas, violeta `#6D5BF6` como único acento |
| `tq-*` | `/r/[code]` y `/r/[code]/carta` | La portada negra con dorado, y la carta en arena cálida con tipografía redonda |
| `mn-*` | `/pulsera/*` | Las pantallas de estado (pulsera no reconocida, inactiva) |

Los prefijos no son decorativos: evitan que un token del panel se cuele en la
página que ve el cliente. Están definidos en `tailwind.config.ts`.

Los dos colores de los gráficos (`#6D5BF6` escaneos, `#D97706` reseñas) pasaron
el validador de paleta contra la superficie blanca: separación para daltonismo
ΔE 33.4 y contraste ≥3:1.

---

## Cómo está organizado

```
src/
├── app/
│   ├── r/[code]/route.ts       ← el endpoint crítico: 302 + caché + log asíncrono
│   ├── pulsera/[estado]/       ← páginas de caso borde que ve el cliente
│   ├── login/                  ← ingreso al panel
│   ├── api/auth/[...all]/      ← handler de Better Auth
│   └── admin/
│       ├── bracelets/          ← pulseras (lo central)
│       ├── restaurants/
│       ├── scans/              ← tabla filtrable + export CSV
│       └── page.tsx            ← dashboard
├── components/
│   ├── ui/                     ← primitivas (botón, input, tabla, diálogo…)
│   └── admin/                  ← navegación, gráfico, filtros
├── db/
│   ├── schema.ts               ← tablas Drizzle
│   ├── index.ts                ← pool mysql2
│   └── queries/                ← consultas por dominio
└── lib/
    ├── redirect-cache.ts       ← Map con TTL de 60s
    ├── scan-logger.ts          ← escritura que nunca rompe el redirect
    ├── hash.ts                 ← SHA-256 del IP con salt
    ├── auth.ts                 ← configuración de Better Auth
    └── validation.ts           ← validación de entradas del panel
```

---

## Decisiones que conviene conocer

**Todas las fechas se guardan en UTC.** El pool de `mysql2` está configurado con
`timezone: "Z"` y las consultas comparan siempre en UTC. La conversión a hora
local pasa únicamente al renderizar, con `Intl.DateTimeFormat`.

**El caché del endpoint de redirección vive en memoria del proceso.** TTL de 60
segundos configurable por `REDIRECT_CACHE_TTL_SECONDS`. Al editar un destino
desde el panel se invalida la entrada a mano, así que el cambio se ve enseguida;
el TTL es la red de contención. Por eso PM2 arranca con una sola instancia.

**Las IPs nunca se guardan en claro.** Se guarda `SHA-256(salt + ip)`. Cambiar
`IP_HASH_SALT` invalida la correlación con los hashes ya guardados.

**El destino se valida dos veces**, al guardarlo en el panel y al usarlo en el
redirect. Solo se aceptan `http` y `https`: sin eso, alguien con acceso al panel
podría dejar un `javascript:` y convertir la pulsera en un vector de ataque
contra los clientes del restaurante.

**No hay registro público.** `disableSignUp: true` en Better Auth. Los usuarios se
crean con el seed o a mano contra la base.

---

## Producción

Ver [DEPLOY.md](./DEPLOY.md).
