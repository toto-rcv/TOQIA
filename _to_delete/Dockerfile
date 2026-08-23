# Imagen de producción para Coolify (o cualquier runtime de contenedores).
#
# Build en tres etapas para que la imagen final pese lo mínimo: solo el server
# standalone que genera Next, sin código fuente, sin devDependencies y sin el
# caché de build.

# ─────────────────────────────────────────────────────────────────────────────
# 1. Dependencias
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
# Algunos binarios de npm esperan glibc; en Alpine hace falta esta capa.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# 2. Build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_APP_URL se hornea en el bundle durante el build: es la que arma
# las URLs que se graban en los chips NFC. TIENE que llegar acá con el valor
# real. En Coolify, definila como variable con "Build Variable" activado.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Estas tres se leen al importar los módulos, así que el build falla sin ellas
# aunque no se use la base para nada durante la compilación. Son placeholders
# que viven solo en esta etapa: la imagen final no los hereda, y si faltan en
# runtime la app corta al arrancar con un mensaje claro.
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/build"
ENV BETTER_AUTH_SECRET="placeholder-de-build-no-usar-en-runtime"
ENV IP_HASH_SALT="placeholder-de-build-no-usar-en-runtime"

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# 3. Runtime
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario sin privilegios: si alguien logra ejecutar algo dentro del
# contenedor, que no sea root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# El modo standalone NO copia los assets estáticos ni /public: hay que moverlos
# a mano a la estructura que espera server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# 0.0.0.0 y no 127.0.0.1: adentro de un contenedor hay que escuchar en todas
# las interfaces para que el proxy pueda llegar.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
