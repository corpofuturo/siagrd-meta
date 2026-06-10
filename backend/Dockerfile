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

RUN pnpm install --frozen-lockfile --filter backend...

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json

RUN pnpm --filter backend run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "backend/dist/index.js"]
