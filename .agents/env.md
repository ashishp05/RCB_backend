# Environment Configuration & Validation Standards

This document specifies mandatory rules for environment variable management and validation in `node_prisma_boilerplate`.

---

## 1. 100% Sequence Synchronization Rule

Whenever an environment variable is added, removed, or renamed, you MUST update all 4 configuration targets in the **exact same order and sequence**:

1. **`.env`** (Active environment file)
2. **`.env.example`** (Version-controlled template for developers)
3. **`src/config/env-schema.ts`** (Zod runtime validation schema)
4. **`src/config/env-config.ts`** (Exported typed `env` object)

---

## 2. Zero `process.env` Rule

- **ALWAYS** access environment variables through the typed `env` object imported from `src/config/env-config.ts`:
  ```typescript
  import { env } from '../config/env-config';

  const port = env.PORT;
  ```
- **NEVER** use raw `process.env.<VAR_NAME>` in any controller, service, repository, middleware, helper, route, or cron job.
- `process.env` is strictly restricted to `src/config/env-schema.ts`.

---

## 3. Storage Configuration Schema Example

```typescript
export const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  HOST_URL: z.string().optional().default('http://localhost:5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Storage configuration
  USE_S3: z.coerce.boolean().default(false),
  AWS_REGION: z.string().optional().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
});
```
