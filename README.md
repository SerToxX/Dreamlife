# 🎌 Dream Life — Plataforma E-commerce de Anime

Sistema completo: **Tienda online + Panel admin + POS** para tienda de merchandising anime.

## 🛠️ Stack

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + Zustand + TanStack Query
- **Backend:** NestJS + Prisma + MySQL 8.0 + JWT
- **Monorepo:** Turborepo + pnpm
- **Infra:** Docker Compose

## ✨ Características

- 🎨 Diseño minimalista B/N con modo oscuro (default)
- 📱 100% responsive
- 🏪 Multi-ubicación (locales + almacén + online)
- 🔍 Gestión por SKU con búsqueda global
- 👥 3 roles: Admin, Worker, Cliente
- 📊 Dashboard con filtros por período (día/semana/mes/año)
- 💰 Ingresos vs Egresos con gráficas
- 🤖 Bot de FAQs + botón WhatsApp
- 🏢 Sección de auspiciadores

## 🚀 Instalación local (Docker)

```bash
# 1. Levantar todos los servicios
docker compose up -d --build

# 2. Aplicar el schema Prisma
docker exec dreamlife_api npx prisma db push --accept-data-loss --skip-generate

# 3. Cargar datos demo (~300 ventas y ~200 gastos de los últimos 120 días)
docker exec dreamlife_api npx tsx prisma/seed.ts
```

## 🌐 URLs

- **Tienda:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **API Docs (Swagger):** http://localhost:3001/api/docs

## 🔑 Usuarios demo

Todos con contraseña: `Racer2001.`

| Rol | Email |
|---|---|
| Admin | admin@dreamlife.com |
| Worker | worker@dreamlife.com |
| Cliente | cliente@demo.com |
| Cliente | ana@demo.com |

⚠️ Para admin/worker: marcar el checkbox "Soy administrador o trabajador" en el login.

## 📁 Estructura

```
dreamlife/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/         # Código compartido
├── docker-compose.yml
└── package.json
```

## 🔄 Reset completo

```bash
docker compose down -v
docker compose up -d --build
docker exec dreamlife_api npx prisma db push --accept-data-loss --skip-generate
docker exec dreamlife_api npx tsx prisma/seed.ts
```
