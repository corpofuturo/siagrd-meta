FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
RUN npm install -g pnpm@9

WORKDIR /app

# Copiar manifiestos del monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json

RUN pnpm install --frozen-lockfile --filter backend...

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json

# Compilar TypeScript
RUN pnpm --filter backend run build

# pnpm deploy resuelve TODAS las dependencias del workspace en un directorio standalone
# Resultado: /app/deploy/ tiene node_modules completo sin symlinks ni workspace magic
RUN pnpm --filter backend deploy --prod /app/deploy

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar node_modules standalone (sin pnpm, sin workspace)
COPY --from=builder /app/deploy/node_modules ./node_modules
# Copiar el build compilado
COPY --from=builder /app/backend/dist ./dist
# package.json necesario para que Node resuelva el "main"
COPY --from=builder /app/deploy/package.json ./package.json

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
