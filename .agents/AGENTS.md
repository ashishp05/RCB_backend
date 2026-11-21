# Project Architectural Standards & AI Coding Rules

This directory contains all mandatory architectural standards, coding rules, and modular API specifications for developers and AI agents working on this **TypeScript + Prisma ORM + PostgreSQL** boilerplate (`node_prisma_boilerplate`).

---

## 📚 Core AI & Developer Guides

1. **[Prisma Schema & Repository Standards (`.agents/schema.md`)](./schema.md)**
   - `prisma/schema.prisma` model definition standards (UUID primary keys, `@default(now())`, `@updatedAt`, relations, indexes) and repository layer (`*.repository.ts`) with Prisma Client queries.

2. **[Express Route Standards (`.agents/route.md`)](./route.md)**
   - Modular feature route registration (`src/features/<feature>/routes/<feature>.routes.ts`), mounting in `src/routes/routes.ts`, mandatory CRUD route ordering, and middleware pipeline (`auth` → `uploadFor` → `validateQuery` / `validateRequest` → `controller`).

3. **[Express Controller Standards (`.agents/controller.md`)](./controller.md)**
   - Class-based controller structure (`export class <Feature>Controller`), `sendJsonResponse` response envelope, `ApiError` handling, media upload & old file replacement lifecycle, and Express 5 async error handling.

4. **[Feature Service Standards (`.agents/service.md`)](./service.md)**
   - Domain logic encapsulation (`export class <Feature>Service`), Repository dependency injection pattern, returning clean raw data objects to controllers, and operational error handling.

5. **[Helper & Storage Architecture (`.agents/helper.md`)](./helper.md)**
   - "Helper First" pattern, Storage Facade (`s3.util.ts`, `local-storage.util.ts`, `file-upload.util.ts`), Email Service (`email.service.ts` & `email.helper.ts` with Handlebars templates), JWT token utility, and Response helpers.

6. **[Cron Job Management Standards (`.agents/cron.md`)](./cron.md)**
   - Background task scheduling in TypeScript, concurrency overlap locking, execution timing, and clean lifecycle management.

7. **[Environment Configuration Standards (`.agents/env.md`)](./env.md)**
   - Strict 100% sequence synchronization rules between `.env`, `.env.example`, `src/config/env-schema.ts`, and `src/config/env-config.ts`.

8. **[Enum & Constant Standards (`.agents/enum.md`)](./enum.md)**
   - Mandatory rules for constants (`ResponseMessages`, `ValidationMessages` in `src/constants/messages.ts`), type-safe Enums, and zero hardcoded string literals.

9. **[Zod Validation Standards (`.agents/zod.md`)](./zod.md)**
   - Request schema architecture (`src/features/<feature>/schemas/<feature>.schema.ts`), non-deprecated Zod methods (`.min(1, '...')`, `.email('...')`), `validateRequest` (body) & `validateQuery` (query params), and TypeScript type inference (`*.types.ts`).

10. **[Code Formation & File Structure Standards (`.agents/code-formation.md`)](./code-formation.md)**
    - Mandatory 5-tier import ordering for TypeScript, class-based file layout, spacing hygiene, and comment conventions.

11. **[Postman Collection & cURL Guide (`.agents/postman.md`)](./postman.md)**
    - Postman collection structure and cURL documentation rules for features.

---

## 📜 Mandatory AI & Developer Rules

### 1. Environment Variables Rule
- **ALWAYS** access environment variables through the typed, validated `env` object imported from `src/config/env-config.ts` (or relative path `../config/env-config`).
- **NEVER** use raw `process.env.<VAR_NAME>` in any controller, service, repository, middleware, helper, route, or cron job.
- `process.env` is strictly restricted to `src/config/env-schema.ts` where Zod validation and parsing happen.
- Whenever an environment variable is added or changed, update `.env`, `.env.example`, `src/config/env-schema.ts`, and `src/config/env-config.ts` in the **exact same group and sequence**.

### 2. Feature-First Modular Architecture
- Code MUST be organized inside feature directories under `src/features/<featureName>/`:
  - `controllers/<feature>.controller.ts`
  - `services/<feature>.service.ts`
  - `repositories/<feature>.repository.ts`
  - `schemas/<feature>.schema.ts`
  - `types/<feature>.types.ts`
  - `routes/<feature>.routes.ts`
- Shared global middleware, config, constants, and utilities live in `src/middleware/`, `src/config/`, `src/constants/`, and `src/utils/`.

### 3. Validation & Constant Rules
- **ALWAYS** use `ValidationMessages` from `src/constants/messages.ts` for client-facing validation errors and messages.
- **ALWAYS** use `ResponseMessages` from `src/constants/messages.ts` for HTTP response envelope messages.
- Developer logs (`console.log`, `console.warn`, `console.error`) must remain plain developer strings and NOT be put into `ValidationMessages`.
- Use `validateRequest` for request body validation and `validateQuery` for URL query parameter validation.

### 4. Enum & Constant Rules
- Declare enums and constants in `src/constants/messages.ts` or feature-level `*.types.ts`.
- NEVER hardcode raw strings like `"ADMIN"`, `"active"`, `"android"` anywhere in business logic.

### 5. Helper First Pattern
- All 3rd-party SDKs (AWS S3, Nodemailer, Handlebars, JWT, Bcrypt) MUST be encapsulated in `src/utils/`.
- Controllers and services must NEVER interact with 3rd-party SDKs directly.

### 6. TypeScript Strictness & Non-Deprecated Syntax
- Maintain 100% strict type safety. Do NOT use `any` unless required for Express request extensions.
- Use non-deprecated Zod syntax (`z.string().min(1, '...')`, `z.string().email('...')`).
- Express 5 natively catches rejected promises in async route handlers; controllers do NOT require redundant try/catch blocks unless performing custom cleanup.

### 7. Comments & Formatting
- Use clean, standard, single-line `//` comments.
- NEVER use decorative box or divider comments like `// ─── ... ───`, `// === ... ===`, or `// ___ ... ___`.

### 8. Class Export & Dependency Injection Convention
- **Repositories**: Export as `export class <Feature>Repository` and accept `prisma: PrismaClient` in the constructor.
- **Services**: Export as `export class <Feature>Service` and accept `<Feature>Repository` via constructor dependency injection.
- **Controllers**: Export as `export class <Feature>Controller` with arrow function method properties (`getAll = async (req: Request, res: Response) => { ... }`) to preserve `this` binding.

### 9. Code Formation & Import Tiering
- Every TypeScript file MUST organize its imports in 5 strict tiers:
  1. External NPM packages (`express`, `http-status-codes`, `zod`, `@prisma/client`)
  2. Project constants (`ResponseMessages`, `ValidationMessages`)
  3. Shared helpers, utilities & middlewares (`ApiError`, `sendJsonResponse`, `validateRequest`)
  4. Feature classes & modules (`ProductService`, `ProductRepository`, `productSchema`)
  5. Config & environment (`env`)
