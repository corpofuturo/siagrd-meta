FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
RUN npm install -g pnpm@9

WORKDIR /app

# Copiar manifiestos del monorepo para que pnpm resuelva el workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
# packages/ui tiene package.json (lo necesita pnpm para mapear el workspace)
COPY packages/ui/package.json ./packages/ui/package.json

# Instalar solo las deps del backend (--filter backend... incluye sus deps de workspace)
RUN pnpm install --frozen-lockfile --filter backend...

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copiar fuentes
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json

RUN pnpm --filter backend run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat && npm install -g pnpm@9
WORKDIR /app

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
