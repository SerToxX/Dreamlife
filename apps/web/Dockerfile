# ── Etapa 1: Build ─────────────────────────────────────
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.0.0

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

RUN pnpm build

# ── Etapa 2: Runner ─────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Docker inyecta HOSTNAME=<container id> automáticamente, y el server.js
# de Next standalone lo usa para decidir en qué IP escuchar (en vez de
# 0.0.0.0 por defecto). Con múltiples redes Docker, esa IP solo coincide
# con la primera red del contenedor — quedaba sordo para el proxy/Traefik,
# que llega por otra red. Forzamos que escuche en todas las interfaces.
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["node", "server.js"]
