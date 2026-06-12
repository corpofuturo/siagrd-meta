# ── Stage 1: builder ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
RUN npm install -g pnpm@9

WORKDIR /app

COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY apps/ciudadano/package.json ./apps/ciudadano/package.json
COPY apps/panel-web/package.json ./apps/panel-web/package.json
COPY apps/socorro/package.json ./apps/socorro/package.json

RUN pnpm install --frozen-lockfile --filter backend...

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json

RUN pnpm --filter backend run build

# ── Stage 2: runner ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache wget
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/index.js"]
