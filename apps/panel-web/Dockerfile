# ── Stage 1: deps ─────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9

WORKDIR /app

COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./package.json
COPY apps/panel-web/package.json ./apps/panel-web/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json

RUN pnpm install --frozen-lockfile --filter panel-web...

# ── Stage 2: builder ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/panel-web/node_modules ./apps/panel-web/node_modules

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter panel-web run build

# ── Stage 3: runner ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/panel-web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/panel-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/panel-web/.next/static ./apps/panel-web/.next/static

USER nextjs
EXPOSE 3001

CMD ["node", "apps/panel-web/server.js"]
