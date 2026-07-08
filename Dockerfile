# syntax=docker/dockerfile:1

# ---- base ----
FROM node:24-slim AS base
WORKDIR /usr/src/app

# ---- install (mysql2 is pure JS — no native build toolchain needed) ----
FROM base AS install
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- build (.output) ----
FROM base AS prerelease
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ---- release ----
FROM node:24-slim AS release
WORKDIR /app
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
# Database is MySQL (see docker-compose); connection via MYSQL_* env vars.
COPY --from=prerelease /usr/src/app/.output ./.output
COPY --from=prerelease /usr/src/app/package.json ./package.json
EXPOSE 3000 5003
CMD ["node", ".output/server/index.mjs"]
