#!/bin/sh
# Entrypoint de PRODUCCION (Render u otro PaaS con contenedores).
set -e

log() { printf '[backend] %s\n' "$1"; }

cd /var/www/html

# Render expone el puerto asignado en $PORT y la DB en $DATABASE_URL.
export PORT="${PORT:-8080}"

if [ -n "${DATABASE_URL:-}" ] && [ -z "${DB_URL:-}" ]; then
    export DB_URL="$DATABASE_URL"
    log "DATABASE_URL mapeada a DB_URL."
fi

# APP_KEY debe venir del panel de variables de entorno. Si no esta, se genera
# una efimera para no dejar el servicio caido, pero las sesiones y cualquier
# dato cifrado se invalidan en cada reinicio.
if [ -z "${APP_KEY:-}" ]; then
    APP_KEY="$(php artisan key:generate --show --no-ansi)"
    export APP_KEY
    log "AVISO: APP_KEY no estaba definida. Se genero una temporal."
    log "AVISO: define APP_KEY en las variables de entorno del servicio."
fi

# Render inyecta el puerto en runtime, asi que nginx se renderiza aqui.
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
log "nginx escuchara en el puerto ${PORT}."

# SQLite solo tiene sentido como fallback: en Render el disco es efimero.
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    log "AVISO: usando SQLite en $DB_FILE. En Render el disco es efimero y los"
    log "AVISO: puntajes se borran en cada deploy. Usa Postgres via DATABASE_URL."
    mkdir -p "$(dirname "$DB_FILE")"
    [ -f "$DB_FILE" ] || touch "$DB_FILE"
    chown www-data:www-data "$DB_FILE"
else
    php /usr/local/bin/db-wait.php 30 2
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    log "Ejecutando migraciones..."
    php artisan migrate --force --no-ansi
fi

# El cache se genera despues de resolver el entorno para que capture los
# valores reales de las variables de Render.
log "Optimizando (config, rutas, vistas)..."
php artisan config:cache --no-ansi
php artisan route:cache  --no-ansi
php artisan view:cache   --no-ansi
php artisan storage:link --no-ansi >/dev/null 2>&1 || true

chown -R www-data:www-data storage bootstrap/cache

log "Backend listo."
exec "$@"
