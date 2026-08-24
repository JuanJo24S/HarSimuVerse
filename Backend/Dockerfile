# syntax=docker/dockerfile:1.7
###############################################################################
# HarSimuVerse — Backend (Laravel 12)
#
# Targets:
#   dev         -> php artisan serve + hot reload por bind-mount (docker compose)
#   production  -> nginx + php-fpm + opcache, listo para Render
#
# Build local:  docker build --target production -t harsimuverse-api ./Backend
###############################################################################

###############################################################################
# Stage 1: base — PHP + extensiones compartidas por dev y produccion
###############################################################################
FROM php:8.3-fpm-alpine AS base

# Dependencias de runtime que necesitan las extensiones compiladas abajo.
RUN apk add --no-cache \
        icu-libs \
        libpq \
        libzip \
        oniguruma \
        tzdata \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libpq-dev \
        libzip-dev \
        oniguruma-dev \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        opcache \
        pcntl \
        pdo_mysql \
        pdo_pgsql \
        zip \
    && apk del .build-deps

# Composer se copia desde su imagen oficial en vez de instalarlo a mano.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1 \
    COMPOSER_MEMORY_LIMIT=-1

WORKDIR /var/www/html

###############################################################################
# Stage 2: vendor — instala dependencias PHP con cache de capas
###############################################################################
FROM base AS vendor

# Solo los manifests primero: cambiar codigo de la app no invalida el cache.
COPY composer.json composer.lock ./

# --no-scripts porque los scripts de post-install necesitan el codigo completo.
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-progress

###############################################################################
# Stage 3: dev — servidor de desarrollo, incluye dev-dependencies
###############################################################################
FROM base AS dev

# En dev queremos las herramientas de desarrollo (pint, phpunit, pail...).
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist --no-progress

COPY docker/php-dev.ini /usr/local/etc/php/conf.d/99-harsimuverse.ini
COPY docker/db-wait.php /usr/local/bin/db-wait.php
COPY docker/entrypoint.dev.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

# El codigo llega por bind-mount desde docker-compose; esta copia solo sirve
# para que la imagen tambien funcione suelta, sin mount.
COPY . .
RUN composer dump-autoload

EXPOSE 8000
ENTRYPOINT ["entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

###############################################################################
# Stage 4: production — nginx + php-fpm bajo supervisord (Render / cualquier PaaS)
#
# NO MOVER: tiene que seguir siendo el ULTIMO stage del archivo. Los blueprints
# de Render no permiten elegir el target de un Dockerfile multi-stage y siempre
# construyen el ultimo; si `dev` quedara al final, produccion se desplegaria con
# artisan serve y APP_DEBUG activo. Ver render.yaml.
###############################################################################
FROM base AS production

RUN apk add --no-cache nginx supervisor gettext

# Configuracion de PHP endurecida para produccion (opcache + limites).
COPY docker/php-production.ini /usr/local/etc/php/conf.d/99-harsimuverse.ini
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-harsimuverse.conf
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker/supervisord.conf /etc/supervisord.conf

# Dependencias ya resueltas en el stage vendor.
COPY --from=vendor /var/www/html/vendor ./vendor

# Codigo de la aplicacion.
COPY . .

# Los scripts de composer se corren ahora que si existe el codigo completo.
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative \
    && mkdir -p storage/framework/{cache/data,sessions,testing,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker/db-wait.php /usr/local/bin/db-wait.php
COPY docker/entrypoint.prod.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

# Render inyecta PORT; 8080 es el default para correr la imagen en local.
ENV PORT=8080 \
    APP_ENV=production \
    APP_DEBUG=false

EXPOSE 8080

# Healthcheck contra la ruta /up que ya expone Laravel.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD php -r 'exit(@file_get_contents("http://127.0.0.1:".getenv("PORT")."/up") === false ? 1 : 0);'

ENTRYPOINT ["entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisord.conf", "-n"]
