# Zod Validation & Type Deduction Standards

Zod is used exclusively for runtime schema validation and TypeScript type inference in `node_prisma_boilerplate`.

---

## 1. Directory Location & Schema Naming

- Schemas live in `src/features/<featureName>/schemas/<featureName>.schema.ts`.
- Types live in `src/features/<featureName>/types/<featureName>.types.ts`.
- Naming conventions:
  - `create<Feature>Schema`
  - `update<Feature>Schema`
  - `get<Feature>QuerySchema`

---

## 2. Mandatory Zod Rules

### Rule 1: Non-Deprecated Zod Methods
- Use **`.min(1, 'Error message')`** instead of `.nonempty()`.
- Use **`.email('Error message')`** directly instead of `.email({ message: '...' })`.

```typescript
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters long'),
});
```

### Rule 2: Query Coercion & Middleware
- Use `z.coerce.number()` or `z.coerce.boolean()` in `get<Feature>QuerySchema`.
- `validateQuery(querySchema)` handles `req.query` validation via `Object.defineProperty()`, preserving coerced TypeScript numbers (`10`) and booleans (`true`) without Express getter conflicts.
- `validateRequest(bodySchema)` handles `req.body` validation.

### Rule 3: Single Source of Truth for Types
- Export TypeScript types in `src/features/<feature>/types/<feature>.types.ts` derived directly from Zod schemas:

```typescript
import { z } from 'zod';
import {
  createProductSchema,
  getProductQuerySchema,
  updateProductSchema,
} from '../schemas/product.schema';

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryFilterInput = z.infer<typeof getProductQuerySchema>;
```

---

## 3. Query Schema Template

```typescript
export const getProductQuerySchema = z.object({
  limit: z.coerce.number().int().nonnegative().optional().default(10),
  skip: z.coerce.number().int().nonnegative().optional().default(0),
  searchTerm: z.string().optional(),
  sortKey: z.enum(['name', 'price', 'stock', 'createdAt']).optional().default('createdAt'),
  sortOrder: z
    .union([z.string(), z.number()])
    .optional()
    .transform(val => (val === 'asc' || val === 1 || val === '1' ? 'asc' : 'desc')),
  needCount: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform(val => val === true || val === 'true' || val === '1'),
});
```
