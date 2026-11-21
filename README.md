# 🚀 Express + TypeScript + Prisma + PostgreSQL Boilerplate

A production-grade, highly scalable backend boilerplate built with **Node.js (>=24)**, **Express 5**, **TypeScript (ES2024)**, and **Prisma ORM** with **PostgreSQL**.

It features a **Feature-First Modular Architecture**, clean Dependency Injection, a Storage Facade supporting both **Local Disk** and **AWS S3 Cloud Storage**, Handlebars email templating, and Zod runtime validation.

---

## ✨ Highlights & Features

### 🛠️ Core Stack & Database
- **TypeScript (ES2024)**: Strict type checking with Node >= 24 target.
- **Express 5**: Fast web framework with native async error catching (no redundant try/catch wrappers required).
- **Prisma ORM + PostgreSQL**: Fully typed database interaction with Prisma Client.

### 🎯 Feature-First Modular Architecture
Each feature module (`src/features/<featureName>/`) is self-contained with its own isolated layers:
- `controllers/<feature>.controller.ts` – Express HTTP request handlers.
- `services/<feature>.service.ts` – Framework-agnostic business logic.
- `repositories/<feature>.repository.ts` – Data access layer wrapping Prisma Client.
- `schemas/<feature>.schema.ts` – Zod schemas for body & query validation.
- `types/<feature>.types.ts` – TypeScript types derived from Zod & Prisma.
- `routes/<feature>.routes.ts` – Express router definitions & middleware pipeline.

### 📸 Dual Storage Engine (Local + AWS S3)
- **Storage Facade**: Seamlessly switch between Local Disk storage (`/uploads/`) and AWS S3 cloud storage using `USE_S3=true/false` in `.env`.
- **Multer Middleware**: Flexible file upload handling with single file, multiple array files, MIME type filtering, file size caps, and automatic file cleanup on request error.

### ✉️ Email Service & Handlebars Templates
- **Nodemailer + Handlebars (`.hbs`)**: Dynamic HTML email generation with Handlebars templates (`src/templates/admin/`).
- **Ready-made templates**: `sendForgotPasswordEmail` and `sendNewUserInvitationEmail` in `src/utils/email.service.ts`.

### ⚡ Request Validation
- `validateRequest` (body) and `validateQuery` (query string, with Zod coercion) middlewares.

### 🔐 Security & Middleware
- **Helmet**: Secures HTTP headers.
- **CORS Whitelisting**: Restricted to `WHITE_LIST_URLS`.
- **Rate Limiting**: Global rate limiter + stricter auth rate limiter for `/login` and `/register`.
- **Environment Validation**: Zod startup validation (`src/config/env-schema.ts`) fails fast if required `.env` keys are missing.

---

## 📂 Project Directory Layout

```bash
prisma/
└── schema.prisma            # Database schema & Prisma models
src/
├── config/                  # Environment validation (Zod) & Prisma Client singleton
├── constants/               # Global ResponseMessages, ValidationMessages & security constants
├── features/                # Feature-based modular architecture
│   └── admin/               # Example module: admin register/login/profile/change-password (JWT)
├── middleware/              # Global middlewares (Auth, ApiError, Security, Upload, Validation)
├── templates/               # Handlebars email templates (.hbs)
├── types/                   # Ambient Express & module type definitions
├── utils/                   # Shared utilities (S3, LocalStorage, Storage Facade, Email, Token)
├── app.ts                   # Express application setup
└── server.ts                # Server entry point
.agents/                     # Master AI architectural standards & coding rules
```

## 🔌 Example API (admin module)

All routes are mounted under `/api/v1`.

| Method | Route | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` and `/heartbeat` | – | Health checks |
| `POST` | `/admin/register` | – | Create an admin and return a JWT |
| `POST` | `/admin/login` | – | Email + password login, returns a JWT |
| `GET` | `/admin/profile` | Bearer | Current admin profile |
| `POST` | `/admin/change-password` | Bearer | Change password |
| `POST` | `/admin/logout` | Bearer | Stateless logout |

To add a new feature, copy `src/features/admin/` as a template and mount its router in `src/routes/routes.ts`.

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

### 3. Run Database Migrations & Generate Prisma Client
If this repository already contains migration files in `prisma/migrations/`, a new developer joining the project only needs to run:
```bash
# Applies all existing committed migrations to the local database and generates Prisma Client
npx prisma migrate dev
```

*(Note: `npx prisma migrate dev --name <migration_name>` is only used when a developer makes NEW changes to `prisma/schema.prisma` and needs to generate a new migration file.)*

### 4. Start Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 🛠️ Available npm Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts dev server with `nodemon` and `tsx` hot-reloading |
| `npm run build` | Compiles TypeScript, resolves path aliases, and copies Handlebars templates to `dist/` |
| `npm start` | Runs production compiled server (`node dist/server.js`) |
| `npm run typecheck` | Runs TypeScript compiler (`tsc --noEmit`) to verify types |
| `npm run lint` | Runs ESLint |
| `npm run lint:fix` | Runs ESLint and auto-fixes issues |
| `npm run format` | Formats all code files with Prettier |
| `npm run format:check` | Checks code formatting against Prettier rules |

---

## 📚 AI & Architectural Guidelines

Architectural standards and AI instructions are documented under [.agents/](.agents/AGENTS.md):
- **[AGENTS.md](.agents/AGENTS.md)** – Master AI rules & index.
- **[schema.md](.agents/schema.md)** – Prisma Schema & Repository standards.
- **[controller.md](.agents/controller.md)** – Express 5 Class Controllers.
- **[service.md](.agents/service.md)** – Service layer & Dependency Injection.
- **[route.md](.agents/route.md)** – Route ordering & middleware pipeline.
- **[zod.md](.agents/zod.md)** – Request schema & Zod query coercion standards.
- **[helper.md](.agents/helper.md)** – Storage Facade & Utility isolation rules.
