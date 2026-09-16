# ── Etapa 1: Build ─────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat python3 make g++
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY . .

RUN npx prisma generate
RUN pnpm build

# ── Etapa 2: Producción ─────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat python3 make g++ mariadb-client
RUN npm install -g pnpm tsx

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

RUN mkdir -p uploads backups

EXPOSE 3001

CMD sh -c "npx prisma db push --accept-data-loss && node dist/src/main"
