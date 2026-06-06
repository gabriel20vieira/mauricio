# syntax=docker/dockerfile:1

# ---- base ----
FROM node:24-slim AS base
WORKDIR /usr/src/app

# ---- install (build native deps: better-sqlite3 needs python/make/g++) ----
FROM base AS install
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
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
# SQLite file lives on a mounted volume; created on first run.
ENV LAR_DB_PATH=/app/data/lar.sqlite
COPY --from=prerelease /usr/src/app/.output ./.output
# node_modules carries the compiled better-sqlite3 native binding.
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=prerelease /usr/src/app/package.json ./package.json
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
