# Despliegue manual en un VPS (sin Coolify)

> **Esta no es la guía que necesitás si usás Coolify.** Para eso está
> [DEPLOY.md](./DEPLOY.md). Este documento queda como referencia para el caso de
> un VPS pelado, donde vos manejás el proceso, el proxy y los backups a mano.

Guía concreta para poner el sistema en producción en un VPS con Ubuntu 22.04 o
24.04, usando PM2 y Caddy. Asumimos un dominio propio ya comprado.

Al final del documento hay una checklist para verificar que quedó todo bien.

---

## 0. Antes de empezar

Necesitás:

- Un VPS con acceso `ssh` y permisos de `sudo`.
- Un dominio con un registro **A** apuntando a la IP del VPS. Verificalo:
  ```bash
  dig +short midominio.com
  ```
  Tiene que devolver la IP del servidor. Si no, esperá a que propague el DNS
  antes de seguir: Caddy no va a poder emitir el certificado.
- Los puertos **80** y **443** abiertos.

---

## 1. Instalar lo necesario en el servidor

```bash
sudo apt update && sudo apt upgrade -y

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# MySQL 8
sudo apt install -y mysql-server
sudo mysql_secure_installation

# PM2
sudo npm install -g pm2

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Verificá las versiones:

```bash
node -v      # v20.x o superior
mysql --version
caddy version
```

---

## 2. Crear la base de datos

```bash
sudo mysql
```

Dentro del prompt de MySQL (cambiá la contraseña por una fuerte):

```sql
CREATE DATABASE pulseras
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'pulseras'@'localhost' IDENTIFIED BY 'PONE_UNA_CONTRASEÑA_FUERTE';
GRANT ALL PRIVILEGES ON pulseras.* TO 'pulseras'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Que el usuario sea `@'localhost'` es a propósito: la base no se expone a la red.

Poné MySQL en UTC, para que coincida con lo que escribe la app:

```bash
sudo tee /etc/mysql/mysql.conf.d/timezone.cnf > /dev/null <<'EOF'
[mysqld]
default-time-zone = '+00:00'
EOF

sudo systemctl restart mysql
```

---

## 3. Clonar el proyecto

```bash
sudo mkdir -p /var/www
sudo chown "$USER":"$USER" /var/www
cd /var/www

git clone <URL_DEL_REPO> pulseras-nfc
cd pulseras-nfc
```

---

## 4. Instalar dependencias

```bash
npm ci --omit=dev=false
```

> Hacen falta también las devDependencies porque `next build` y `drizzle-kit` están
> ahí. Después del build se pueden podar con `npm prune --omit=dev` si querés
> ahorrar espacio, pero perdés la posibilidad de correr migraciones sin reinstalar.

---

## 5. Configurar las variables de entorno

```bash
cp .env.example .env
nano .env
```

Valores de producción:

```env
DATABASE_URL="mysql://pulseras:LA_CONTRASEÑA_FUERTE@127.0.0.1:3306/pulseras"

BETTER_AUTH_SECRET="<openssl rand -base64 32>"
BETTER_AUTH_URL="https://midominio.com"

NEXT_PUBLIC_APP_URL="https://midominio.com"
IP_HASH_SALT="<openssl rand -hex 32>"

REDIRECT_CACHE_TTL_SECONDS="60"

NODE_ENV="production"
PORT="3000"
```

Generá los dos secretos ahora y guardalos en tu gestor de contraseñas:

```bash
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -hex 32      # IP_HASH_SALT
```

Restringí los permisos del archivo, que tiene la contraseña de la base:

```bash
chmod 600 .env
```

> **`NEXT_PUBLIC_APP_URL` se hornea en el build.** Si la cambiás después, hay que
> volver a buildear: es la que arma las URLs que se graban en los chips.

---

## 6. Migrar la base

```bash
npm run db:push
```

Para crear el usuario del panel, editá temporalmente en el `.env` las variables
`SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` con las credenciales reales y corré:

```bash
npm run db:seed
```

El seed es idempotente y solo crea escaneos de ejemplo si la tabla está vacía. Si
no querés los restaurantes de ejemplo en producción, borralos desde el panel una
vez que entres, o creá el usuario a mano.

Después de crear el usuario, **sacá la contraseña del `.env`.**

---

## 7. Buildear

```bash
npm run build
```

`next.config.ts` está en modo `standalone`, así que el build genera
`.next/standalone/server.js` con solo lo necesario para correr. Ese modo **no**
copia los assets estáticos automáticamente, así que hay que moverlos:

```bash
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public
```

Conviene dejarlo como script para no olvidarse en cada deploy:

```bash
cat > deploy.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git pull
npm ci
npm run db:push
npm run build

mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

pm2 reload ecosystem.config.js --env production
EOF

chmod +x deploy.sh
```

---

## 8. Levantar con PM2

```bash
mkdir -p logs

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

`pm2 startup` imprime un comando con `sudo`. **Copialo y ejecutalo**: es lo que
hace que la app vuelva sola después de un reinicio del servidor.

Verificá:

```bash
pm2 status
pm2 logs pulseras-nfc --lines 50
curl -I http://127.0.0.1:3000/admin     # tiene que responder (307 al login)
```

---

## 9. Apuntar el dominio con Caddy

```bash
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile      # reemplazá midominio.com por el tuyo
sudo mkdir -p /var/log/caddy && sudo chown caddy:caddy /var/log/caddy

sudo systemctl reload caddy
sudo systemctl status caddy
```

Caddy pide el certificado a Let's Encrypt solo, la primera vez que alguien entra
al dominio. Puede tardar unos segundos. Si falla, mirá los logs:

```bash
sudo journalctl -u caddy -n 50 --no-pager
```

Las causas más comunes son que el DNS todavía no propagó o que el puerto 80 está
cerrado (Let's Encrypt lo necesita para la validación).

Probá desde afuera:

```bash
curl -I https://midominio.com/r/B001
```

Tiene que devolver `302` con el header `Location` apuntando a Google.

---

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

El puerto 3000 **no** se abre: la app solo escucha en `127.0.0.1` y se llega a
ella a través de Caddy.

---

## 11. Backups automáticos

El script ya está en el repo. Probalo a mano primero:

```bash
./scripts/backup-mysql.sh
ls -lh backups/
```

Y agendalo:

```bash
crontab -e
```

Agregá esta línea (backup diario a las 03:15, hora del servidor):

```cron
15 3 * * * /var/www/pulseras-nfc/scripts/backup-mysql.sh >> /var/log/pulseras-backup.log 2>&1
```

Guarda un `.sql.gz` por día en `backups/` y borra los de más de 14 días.

> **Un backup que solo vive en el mismo servidor no es un backup.** Copialos a
> otro lado — `rclone` a un bucket, `rsync` a otra máquina, lo que tengas. Si se
> pierde el VPS se pierden los dumps también.

Para restaurar:

```bash
gunzip -c backups/pulseras_2026-08-18_031500.sql.gz | mysql -u pulseras -p pulseras
```

---

## Checklist final

- [ ] `https://midominio.com/admin` muestra el login con candado verde
- [ ] Se puede entrar con el usuario admin
- [ ] `https://midominio.com/r/B001` redirige a Google
- [ ] El escaneo aparece en `/admin/scans` con la IP hasheada (no en claro)
- [ ] Cambiar el destino de una pulsera desde el panel se refleja al instante
- [ ] Una pulsera desactivada muestra la página "no está activa"
- [ ] Un código inexistente (`/r/NOEXISTE`) muestra "Pulsera no reconocida"
- [ ] `pm2 status` muestra la app `online`
- [ ] Después de `sudo reboot`, la app vuelve sola
- [ ] `./scripts/backup-mysql.sh` genera un `.sql.gz` válido
- [ ] El cron de backup está agendado
- [ ] Los backups se copian fuera del servidor
- [ ] `.env` tiene permisos `600` y secretos propios (no los de `.env.example`)

---

## Operación diaria

```bash
# Ver logs en vivo
pm2 logs pulseras-nfc

# Reiniciar sin cortar el servicio
pm2 reload pulseras-nfc

# Desplegar una versión nueva
cd /var/www/pulseras-nfc && ./deploy.sh

# Ver los últimos escaneos directo en la base
mysql -u pulseras -p pulseras -e \
  "SELECT s.scanned_at, b.code, r.name FROM scans s
     JOIN bracelets b ON b.id = s.bracelet_id
     JOIN restaurants r ON r.id = s.restaurant_id
   ORDER BY s.scanned_at DESC LIMIT 20;"
```

### Si el endpoint de redirección deja de responder

1. `pm2 status` — ¿está `online`?
2. `pm2 logs pulseras-nfc --err --lines 100` — ¿hay errores de conexión a MySQL?
3. `sudo systemctl status mysql` — ¿la base está arriba?
4. `curl -I http://127.0.0.1:3000/r/B001` — ¿responde la app sin pasar por Caddy?

Si la app responde en el paso 4 pero no desde afuera, el problema está en Caddy o
en el DNS, no en la aplicación.
