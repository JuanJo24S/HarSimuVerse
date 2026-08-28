#!/bin/sh
# Entrypoint de DESARROLLO del frontend.
# El bind-mount del host oculta el node_modules de la imagen, asi que hay que
# comprobarlo en tiempo de arranque.
set -e

log() { printf '\033[35m[frontend]\033[0m %s\n' "$1"; }

cd /app

if [ ! -d node_modules ] || [ ! -d node_modules/@angular ]; then
    log "node_modules incompleto, instalando dependencias..."
    if [ -f package-lock.json ]; then
        npm ci --no-audit --no-fund
    else
        npm install --no-audit --no-fund
    fi
fi

log "Frontend listo en http://localhost:${FRONTEND_PORT:-4200}"

exec "$@"
