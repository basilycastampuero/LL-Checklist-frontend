# syntax=docker/dockerfile:1

# ---- base: dependencias instaladas una sola vez, reusadas por dev y build ----
# Node 22, el mismo que fijan .nvmrc, engines y la CI: la imagen no debe
# compilar con una versión distinta de la que se valida.
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: servidor de Vite con hot-reload (usado por docker-compose) ----
# El código fuente se monta como bind mount en compose; esta copia solo cubre
# el caso de construir la imagen standalone (docker build --target dev).
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build: compila el bundle de producción ----
# VITE_API_MODE se lee en tiempo de build (Vite lo incrusta en el bundle).
# Sin pasarlo, el build de producción cae en 'real' (lib/env.ts), y esta
# imagen no trae backend: para una demo, --build-arg VITE_API_MODE=mock.
# Si no se pasa, se borra del entorno en vez de exportarlo vacío: un string
# vacío no lo atrapa el `??` de env.ts y dejaría apiMode en ''.
FROM base AS build
ARG VITE_API_MODE
COPY . .
RUN if [ -n "$VITE_API_MODE" ]; then export VITE_API_MODE; else unset VITE_API_MODE; fi \
    && npm run build

# ---- production: nginx sirviendo el build estático ----
FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
