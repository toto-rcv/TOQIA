#!/usr/bin/env bash
#
# Backup diario de MySQL, comprimido, con rotación de los últimos 14 días.
#
# Uso:
#   ./scripts/backup-mysql.sh
#
# Cron (todos los días a las 03:15, hora del servidor):
#   15 3 * * * /var/www/pulseras-nfc/scripts/backup-mysql.sh >> /var/log/pulseras-backup.log 2>&1
#
# Lee la conexión de DATABASE_URL en el .env del proyecto, así que no hay
# credenciales duplicadas en dos lados.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fatal() {
  log "ERROR: $1"
  exit 1
}

[ -f "$ENV_FILE" ] || fatal "no se encontró el archivo de entorno en $ENV_FILE"

# Leemos solo DATABASE_URL en vez de hacer `source` del .env entero: no
# queremos que un valor con espacios o comillas raras rompa el script.
DATABASE_URL="$(grep -E '^[[:space:]]*DATABASE_URL[[:space:]]*=' "$ENV_FILE" \
  | tail -n 1 \
  | cut -d '=' -f 2- \
  | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"

[ -n "$DATABASE_URL" ] || fatal "DATABASE_URL está vacía en $ENV_FILE"

# mysql://usuario:contraseña@host:puerto/base
if [[ ! "$DATABASE_URL" =~ ^mysql://([^:]+):([^@]*)@([^:/]+):?([0-9]*)/(.+)$ ]]; then
  fatal "no se pudo interpretar DATABASE_URL (se esperaba mysql://usuario:pass@host:puerto/base)"
fi

DB_USER="${BASH_REMATCH[1]}"
DB_PASS="${BASH_REMATCH[2]}"
DB_HOST="${BASH_REMATCH[3]}"
DB_PORT="${BASH_REMATCH[4]:-3306}"
DB_NAME="${BASH_REMATCH[5]%%\?*}"   # saca cualquier ?param=valor del final

command -v mysqldump >/dev/null 2>&1 || fatal "mysqldump no está instalado"
command -v gzip >/dev/null 2>&1 || fatal "gzip no está instalado"

mkdir -p "$BACKUP_DIR"

STAMP="$(date '+%Y-%m-%d_%H%M%S')"
TARGET="$BACKUP_DIR/${DB_NAME}_${STAMP}.sql.gz"
TMP="$TARGET.partial"

log "volcando $DB_NAME desde $DB_HOST:$DB_PORT"

# La contraseña va por variable de entorno y no por argumento: los argumentos
# son visibles en `ps` para cualquier usuario de la máquina.
if ! MYSQL_PWD="$DB_PASS" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  --no-tablespaces \
  "$DB_NAME" | gzip -9 > "$TMP"; then
  rm -f "$TMP"
  fatal "el dump falló; no se generó ningún archivo"
fi

# Recién cuando el dump terminó bien le ponemos el nombre definitivo. Así
# nunca queda un .sql.gz truncado que parezca un backup válido.
mv "$TMP" "$TARGET"

SIZE="$(du -h "$TARGET" | cut -f1)"
log "backup listo: $TARGET ($SIZE)"

# Rotación: borra los dumps con más de RETENTION_DAYS días.
BORRADOS="$(find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}_*.sql.gz" -type f -mtime "+$RETENTION_DAYS" -print -delete | wc -l)"
log "rotación: se borraron $BORRADOS backups de más de $RETENTION_DAYS días"

# Chequeo mínimo de integridad: si el gzip está corrupto, mejor enterarse acá
# y no el día que haya que restaurar.
if ! gzip -t "$TARGET" 2>/dev/null; then
  fatal "el archivo generado no pasa la verificación de gzip: $TARGET"
fi

log "verificación OK"
