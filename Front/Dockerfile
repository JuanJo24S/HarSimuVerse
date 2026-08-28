# syntax=docker/dockerfile:1.7
###############################################################################
# HarSimuVerse — Frontend (Angular 19)
#
# Targets:
#   dev         -> ng serve con hot reload por bind-mount (docker compose)
#   production  -> bundle estatico servido por nginx (paridad con Vercel)
#
# En Vercel NO se usa este Dockerfile: alli se construye con `npm run build`
# y se sirve dist/front/browser. El target production existe para poder
# reproducir el build de produccion en local y para desplegar en otro PaaS.
###############################################################################

###############################################################################
# Stage 1: deps — node_modules cacheados por package-lock
###############################################################################
FROM node:22-alpine AS deps

WORKDIR /app

# Solo los manifests: cambiar codigo fuente no reinstala dependencias.
COPY package.json package-lock.json* ./

# npm ci si hay lockfile (build reproducible), npm install como fallback.
RUN if [ -f package-lock.json ]; then \
        npm ci --no-audit --no-fund; \
    else \
        echo "AVISO: sin package-lock.json, usando npm install"; \
        npm install --no-audit --no-fund; \
    fi

###############################################################################
# Stage 2: dev — servidor de desarrollo de Angular
###############################################################################
FROM node:22-alpine AS dev

# git/openssh los pide algun paquete de Angular CLI al resolver schematics.
RUN apk add --no-cache git

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY docker/entrypoint.dev.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

ENV NODE_ENV=development \
    NG_CLI_ANALYTICS=false

EXPOSE 4200

ENTRYPOINT ["entrypoint"]
# --poll: los eventos inotify no cruzan bien el bind-mount en Docker Desktop.
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200", "--poll", "1500"]

###############################################################################
# Stage 3: build — bundle de produccion
###############################################################################
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NG_CLI_ANALYTICS=false

RUN npm run build

###############################################################################
# Stage 4: production — nginx sirviendo el bundle
###############################################################################
FROM nginx:1.27-alpine AS production

RUN apk add --no-cache gettext

# El application builder de Angular 19 emite en dist/<project>/browser.
COPY --from=build /app/dist/front/browser /usr/share/nginx/html

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --spider -q "http://127.0.0.1:${PORT}/" || exit 1

# La imagen de nginx ya procesa /etc/nginx/templates/*.template con envsubst.
CMD ["nginx", "-g", "daemon off;"]
