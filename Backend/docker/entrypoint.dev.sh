#!/bin/sh
# Entrypoint de DESARROLLO.
# El codigo viene por bind-mount, asi que aqui se resuelve todo lo que depende
# del estado del host: vendor/, .env, permisos y migraciones.
set -e

log() { printf '\033[36m[backend]\033[0m %s\n' "$1"; }

cd /var/www/html

# Render y algunos proveedores exponen la conexion como DATABASE_URL.
# Laravel la lee de DB_URL, asi que la mapeamos si hace falta.
if [ -n "${DATABASE_URL:-}" ] && [ -z "${DB_URL:-}" ]; then
    export DB_URL="$DATABASE_URL"
    log "DATABASE_URL mapeada a DB_URL."
fi

# 1. Dependencias: el bind-mount puede ocultar el vendor/ de la imagen.
if [ ! -f vendor/autoload.php ]; then
    log "vendor/ no encontrado, instalando dependencias de Composer..."
    composer install --prefer-dist --no-progress --no-interaction
fi

# 2. Archivo .env: se crea desde el ejemplo la primera vez.
if [ ! -f .env ]; then
    log ".env no encontrado, copiando desde .env.example..."
    cp .env.example .env
fi

###############################################################################
# 3. Volcar la configuracion del contenedor dentro de .env.
#
# Esto NO es redundante con las variables de docker-compose, es obligatorio.
#
# `php artisan serve` no ejecuta la app: lanza el servidor embebido de PHP como
# SUBPROCESO, y al hacerlo borra del entorno del hijo toda variable que no este
# en su lista blanca. Se puede ver en el propio framework:
#
#   vendor/laravel/framework/src/Illuminate/Foundation/Console/ServeCommand.php
#   ...
#   public static $passthroughVariables = ['APP_ENV', 'PATH', 'XDEBUG_MODE', ...];
#   ...
#   return in_array($key, static::$passthroughVariables) ? [$key => $value] : [$key => false];
#
# DB_CONNECTION, DB_HOST y compania NO estan en esa lista, asi que llegan
# borradas al proceso que atiende las peticiones y Laravel cae al valor del
# .env. Sintoma exacto que producia: las migraciones corrian perfectamente
# contra Postgres (artisan si ve el entorno del contenedor), pero cada peticion
# HTTP respondia 500 con
#   "Database file at path [/var/www/html/database/database.sqlite] does not exist"
# porque el .env copiado del ejemplo trae DB_CONNECTION=sqlite.
#
# Escribiendo los valores en .env, el subproceso los lee y ambos caminos
# (artisan y HTTP) apuntan a la misma base.
###############################################################################

# Reescribe una clave en .env sin romperse con /, : o , en el valor
# (por eso no se usa `sed s/.../.../`).
set_env() {
    _key="$1"
    _value="$2"

    if grep -qE "^${_key}=" .env 2>/dev/null; then
        grep -vE "^${_key}=" .env > .env.tmp && mv .env.tmp .env
    fi

    printf '%s="%s"\n' "$_key" "$_value" >> .env
}

# APP_KEY queda fuera a proposito: se genera abajo y debe sobrevivir reinicios.
for _var in APP_NAME APP_ENV APP_DEBUG APP_URL \
            LOG_CHANNEL LOG_LEVEL \
            DB_CONNECTION DB_URL DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD \
            SESSION_DRIVER CACHE_STORE QUEUE_CONNECTION \
            FRONTEND_URL CORS_ALLOWED_ORIGINS; do
    # eval para leer la variable cuyo nombre esta en $_var (sh no tiene ${!x}).
    eval "_val=\${$_var:-}"
    if [ -n "$_val" ]; then
        set_env "$_var" "$_val"
    fi
done
log "Configuracion del contenedor volcada en .env (DB_CONNECTION=${DB_CONNECTION:-sqlite})."

# 4. APP_KEY: sin esto Laravel no arranca.
if ! grep -qE '^APP_KEY=base64:.+' .env; then
    log "Generando APP_KEY..."
    php artisan key:generate --force --ansi
fi

# 5. Permisos de escritura (el mount puede traer permisos del host).
mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs \
         bootstrap/cache
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# 6. En dev nunca queremos config cacheada: oculta cambios en .env.
php artisan config:clear --ansi >/dev/null 2>&1 || true
php artisan route:clear  --ansi >/dev/null 2>&1 || true
php artisan view:clear   --ansi >/dev/null 2>&1 || true

# 7. SQLite necesita que el archivo exista antes de migrar.
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    if [ ! -f "$DB_FILE" ]; then
        log "Creando base SQLite en $DB_FILE"
        mkdir -p "$(dirname "$DB_FILE")"
        touch "$DB_FILE"
    fi
else
    log "Esperando a la base de datos..."
    php /usr/local/bin/db-wait.php 30 2
fi

# 8. Migraciones.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    log "Ejecutando migraciones..."
    php artisan migrate --force --ansi
fi

log "Backend listo en http://localhost:${APP_PORT:-8000}"
exec "$@"
