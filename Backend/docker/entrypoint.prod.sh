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

###############################################################################
# Puerto interno de Reverb.
#
# nginx escucha en $PORT (lo asigna el PaaS en runtime) y Reverb necesita OTRO
# puerto solo para el trafico interno, porque nginx le proxia /ws.
#
# Si los dos coincidieran, el segundo en arrancar muere con
# "Failed to listen on tcp://0.0.0.0:PORT: Address in use". Y el fallo es
# traicionero: nginx sigue sirviendo la API con normalidad, asi que el servicio
# parece sano y lo unico que no funciona es el canal de estado — precisamente lo
# que existe para avisar de que algo va mal.
#
# Por eso no se confia en que "no suele pasar": si chocan, se desplaza.
###############################################################################
export REVERB_SERVER_PORT="${REVERB_SERVER_PORT:-8080}"

if [ "$REVERB_SERVER_PORT" = "$PORT" ] || [ "$REVERB_SERVER_PORT" = "9000" ]; then
    # 9000 esta ocupado por php-fpm.
    _old="$REVERB_SERVER_PORT"
    REVERB_SERVER_PORT=$((PORT + 1))
    [ "$REVERB_SERVER_PORT" = "9000" ] && REVERB_SERVER_PORT=$((PORT + 2))
    export REVERB_SERVER_PORT
    log "AVISO: el puerto interno de Reverb ($_old) chocaba; se usa $REVERB_SERVER_PORT."
fi

###############################################################################
# Y aqui la otra mitad, que es facil pasar por alto:
#
#   REVERB_SERVER_PORT = donde ESCUCHA Reverb.
#   REVERB_PORT        = por donde el backend y el latido lo ALCANZAN.
#
# Son dos variables distintas y tienen que apuntar al mismo sitio. Si solo se
# desplaza la primera, la segunda conserva su default (443) y el latido intenta
# emitir contra 127.0.0.1:443, donde no hay nada:
#
#   No se pudo emitir el latido: cURL error 7: Failed to connect to 127.0.0.1:443
#
# Como en este despliegue los dos procesos comparten contenedor, el destino
# siempre es el puerto local en el que Reverb acabo escuchando.
###############################################################################
export REVERB_PORT="$REVERB_SERVER_PORT"
export REVERB_HOST="${REVERB_HOST:-127.0.0.1}"
export REVERB_SCHEME="${REVERB_SCHEME:-http}"

# Render inyecta el puerto en runtime, asi que nginx se renderiza aqui.
envsubst '${PORT} ${REVERB_SERVER_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
log "nginx escuchara en el puerto ${PORT}; Reverb, en el ${REVERB_SERVER_PORT} interno."

###############################################################################
# Aviso temprano de configuracion incompleta.
#
# Si el servicio se crea a mano en el panel en vez de con el blueprint, es facil
# que falten variables. Y los defaults de Laravel las tapan en vez de fallar:
# DB_CONNECTION cae a 'sqlite' y CACHE_STORE a 'database', asi que la app intenta
# cachear en un SQLite de solo lectura y todo revienta con un 500 opaco:
#
#   SQLSTATE[HY000]: General error: 8 attempt to write a readonly database
#
# El log tardaba en delatar la causa. Estas lineas la ponen en la primera
# pantalla de arranque, que es donde se mira cuando un deploy no responde.
###############################################################################
if [ "${APP_ENV:-production}" = "production" ]; then
    if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ] && [ -z "${DATABASE_URL:-}" ]; then
        log "======================================================================"
        log "AVISO: DB_CONNECTION no esta configurada y no hay DATABASE_URL."
        log "AVISO: La aplicacion usara SQLite sobre un disco efimero: los puntajes"
        log "AVISO: se borran en cada deploy y la base es de solo lectura."
        log "AVISO: Define DB_CONNECTION=pgsql y DATABASE_URL en el panel."
        log "======================================================================"
    fi

    if [ -z "${CACHE_STORE:-}" ]; then
        log "AVISO: CACHE_STORE no esta definida; Laravel usara el driver 'database'."
        log "AVISO: Sin base escribible eso rompe cualquier escritura de cache."
        log "AVISO: Define CACHE_STORE=file."
    fi
fi

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

###############################################################################
# Marca de arranque, para el uptime que publica /api/health.
#
# Es el dato que responde a la pregunta que importa en un plan gratuito con
# suspension por inactividad: el servicio ya estaba en marcha, o lo levanto esta
# visita. Se escribe una vez, al arrancar el contenedor.
###############################################################################
mkdir -p storage/app
date +%s > storage/app/boot_time
chown www-data:www-data storage/app/boot_time 2>/dev/null || true

log "Backend listo."
exec "$@"
