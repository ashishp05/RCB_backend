# Complete Prisma 7 & PostgreSQL Guidelines for Developers

> **Target Audience:** Engineering Team (including developers transitioning from MongoDB / NoSQL to PostgreSQL & Prisma ORM).
> **Environment:** Node.js `>=24`, Prisma `^7.9.1`, PostgreSQL with `@prisma/adapter-pg` driver adapter.

---

## Table of Contents
1. [Mental Shift: MongoDB vs PostgreSQL](#1-mental-shift-mongodb-vs-postgresql)
2. [Prisma 7 Architecture in this Project](#2-prisma-7-architecture-in-this-project)
3. [Prisma Command Reference Matrix](#3-prisma-command-reference-matrix)
4. [Development Workflows (Step-by-Step)](#4-development-workflows-step-by-step)
   - [Case 1: Creating/Modifying Schema in Local Dev](#case-1-creatingmodifying-schema-in-local-dev)
   - [Case 2: Pulling Latest Git Changes from Teammates](#case-2-pulling-latest-git-changes-from-teammates)
   - [Case 3: Staging & Production Deployment (CI/CD)](#case-3-staging--production-deployment-cicd)
   - [Case 4: Fast Prototyping (`db push`)](#case-4-fast-prototyping-db-push)
   - [Case 5: Breaking Changes & Column Renaming (Data Safety)](#case-5-breaking-changes--column-renaming-data-safety)
   - [Case 6: Handling Migration Drift & Out-of-Sync Database](#case-6-handling-migration-drift--out-of-sync-database)
5. [Repository NPM Scripts](#5-repository-npm-scripts)
6. [Do's and Don'ts Checklist](#6-dos-and-donts-checklist)

---

## 1. Mental Shift: MongoDB vs PostgreSQL

If you are coming from MongoDB, PostgreSQL and Prisma require a strict, structured approach to data models:

| Feature | MongoDB / Mongoose | PostgreSQL / Prisma 7 |
| :--- | :--- | :--- |
| **Schema Flexibility** | Schema-less / Loose (Add fields anytime without database migrations) | **Strict Schema** (Database columns must exist before data is stored) |
| **Relationships** | Embedded documents or loose `ObjectId` references | **Foreign Key Constraints** (`@relation`). If referenced ID does not exist, insert fails |
| **Data Modifications** | Code update is usually sufficient | **Database Migration Required**: Schema change -> Migration SQL -> DB Execution |
| **Types & Validation** | Runtime validation via Mongoose/Zod | Dual validation: Database-level strict Types + Prisma Client TypeScript Types |
| **Version Control** | No database schema files in Git | **`prisma/migrations/` MUST be committed to Git** |

---

## 2. Prisma 7 Architecture in this Project

This project uses **Prisma 7**, which introduces important modern standards:

1. **`prisma/schema.prisma`**: Defines database models. In Prisma 7, `url` is **removed** from `datasource db`:
   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```
2. **`prisma.config.ts`**: Configures CLI operations (`prisma migrate`, `prisma generate`) with database credentials:
   ```typescript
   import { env } from './src/config/env-config';
   import { defineConfig } from 'prisma/config';

   export default defineConfig({
     datasource: {
       url: env.DATABASE_URL,
     },
   });
   ```
3. **`src/config/prisma.config.ts`**: Instantiates `PrismaClient` at runtime using the **`@prisma/adapter-pg`** driver adapter with `pg.Pool` connection pooling for high performance.

---

## 3. Prisma Command Reference Matrix

| Command | Purpose | Safe for Prod? | When to Use |
| :--- | :--- | :---: | :--- |
| `npx prisma migrate dev --name <name>` | Creates SQL migration file, applies to local DB, updates Prisma Client | ❌ **NEVER** | Local development when schema changes |
| `npx prisma migrate deploy` | Applies pending committed migration SQL files to DB | ✅ **YES** | Production / Staging CI/CD pipelines |
| `npx prisma generate` | Generates TypeScript definitions in `node_modules/@prisma/client` | ✅ **YES** | After pulling code, after `npm install`, or in build pipeline |
| `npx prisma migrate status` | Checks if database is in sync with `prisma/migrations` | ✅ **YES** | Troubleshooting or pre-deployment check |
| `npx prisma db push` | Pushes schema directly to DB without creating migration SQL files | ❌ **NO** | Temporary prototyping / Sandbox testing only |
| `npx prisma studio` | Opens visual GUI in browser to inspect/edit database data | ⚠️ Read-only in Prod | Local debugging & data inspection |

---

## 4. Development Workflows (Step-by-Step)

### Case 1: Creating/Modifying Schema in Local Dev
**Scenario:** You need to add a new table or add/modify fields in `prisma/schema.prisma`.

1. **Edit the Schema:** Open `prisma/schema.prisma` and make your changes.
   ```prisma
   model Product {
     id       String  @id @default(uuid())
     name     String
     isOption Boolean @default(false) // Added new field
   }
   ```
2. **Run Migration Command:**
   ```bash
   npx prisma migrate dev --name add_is_option_to_product
   ```
   *What this does automatically:*
   - Creates a SQL file under `prisma/migrations/<timestamp>_add_is_option_to_product/migration.sql`.
   - Runs the SQL against your local PostgreSQL database.
   - Automatically runs `prisma generate` to update TypeScript types.
3. **Test your code:** TypeScript will now auto-complete the new field (`product.isOption`).
4. **Commit to Git:**
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "feat: add isOption field to Product model"
   ```

---

### Case 2: Pulling Latest Git Changes from Teammates
**Scenario:** You pulled the latest `main` branch, and a teammate added new migrations.

1. **Pull changes:**
   ```bash
   git pull origin main
   ```
2. **Apply new migrations locally & update client:**
   ```bash
   npm run db:migrate
   ```
   *(Or `npx prisma migrate dev`)*
   This detects any unapplied migration files created by your team and applies them to your local database.

---

### Case 3: Staging & Production Deployment (CI/CD)
**Scenario:** Deploying new features to Staging or Production.

> ⚠️ **CRITICAL WARNING:** NEVER run `prisma migrate dev` or `prisma db push` in Production. It will fail or reset data!

**CI/CD Pipeline Sequence:**
```bash
# 1. Install dependencies
npm ci

# 2. Safely apply all pending SQL migrations to Production Database
npx prisma migrate deploy

# 3. Generate fresh Prisma Client
npx prisma generate

# 4. Build TypeScript application
npm run build

# 5. Start application server
npm start
```

*Why `prisma migrate deploy` is safe for Production:*
- It only executes approved, version-controlled `.sql` files from `prisma/migrations/`.
- It never prompts for input or drops tables.
- It records executed migrations in the `_prisma_migrations` system table.

---

### Case 4: Fast Prototyping (`db push`)
**Scenario:** You are experimenting locally on a feature branch and making frequent schema trial changes without wanting to flood Git with migration files.

1. Push schema changes directly to local database:
   ```bash
   npx prisma db push
   ```
2. Once your schema design is finalized and tested:
   ```bash
   # Create the official migration file before opening a Pull Request
   npx prisma migrate dev --name finalize_feature_schema
   ```

---

### Case 5: Breaking Changes & Column Renaming (Data Safety)
**Scenario:** You want to rename a column (e.g. `firstName` to `givenName`) without losing existing data.

By default, if you rename a field in `schema.prisma`, Prisma might generate a migration that drops `firstName` (destroying data) and creates `givenName`.

**Safe Column Rename Steps:**
1. Create the migration file **without executing it immediately**:
   ```bash
   npx prisma migrate dev --create-only --name rename_first_name_to_given_name
   ```
2. Open the generated `migration.sql` file in `prisma/migrations/<timestamp>_.../migration.sql`.
3. Change the SQL from `DROP`/`ADD` to `RENAME`:
   ```sql
   -- Modify generated SQL to preserve data:
   ALTER TABLE "User" RENAME COLUMN "firstName" TO "givenName";
   ```
4. Apply the modified migration locally:
   ```bash
   npx prisma migrate dev
   ```

---

### Case 6: Handling Migration Drift & Out-of-Sync Database
**Scenario:** Your database schema is out of sync or throwing migration errors.

1. **Check status of database migrations:**
   ```bash
   npx prisma migrate status
   ```
2. **If local database is corrupted in development only:**
   ```bash
   # WARNING: Deletes all local dev data and recreates database cleanly
   npx prisma migrate reset
   ```

---

## 5. Repository NPM Scripts

Use these pre-configured package scripts in your daily development:

```json
"scripts": {
  "db:migrate": "prisma migrate dev",     // Run in local dev after schema edits
  "db:deploy": "prisma migrate deploy",   // Run in CI/CD Production deployment
  "db:generate": "prisma generate",       // Regenerate Prisma TypeScript client
  "db:studio": "prisma studio"            // Open visual database viewer in browser
}
```

---

## 6. Do's and Don'ts Checklist

### ✅ DO:
- **DO** commit the entire `prisma/migrations/` folder to Git.
- **DO** include descriptive names for migrations (`--name add_user_role`).
- **DO** use `npx prisma migrate deploy` in production pipelines.
- **DO** check foreign keys when creating records (`categoryId`, `userId` must exist).

### ❌ DON'T:
- **DON'T** manually edit previously committed/deployed migration `.sql` files.
- **DON'T** run `prisma migrate dev` or `prisma db push` on Production databases.
- **DON'T** delete the `prisma/migrations/` folder once shared with the team.
- **DON'T** ignore `P2003` foreign key errors — ensure referenced parent records exist first!
