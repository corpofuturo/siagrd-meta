FROM node:20-alpine
RUN apk add --no-cache libc6-compat python3 make g++
RUN npm install -g pnpm@9

WORKDIR /app

# Manifiestos del monorepo (incluye .npmrc con shamefully-hoist=true)
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

# Mover dist a /app/dist para que coincida con el start command de Railway
RUN cp -r backend/dist dist

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
