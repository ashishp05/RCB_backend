# TypeScript Code Formation & File Structure Standards

All files in `node_prisma_boilerplate` MUST adhere strictly to the import ordering, class structure, and spacing conventions defined in this document.

---

## 1. Mandatory 5-Tier Import Structure

Imports in every TypeScript file must be organized in 5 distinct groups, separated by a single blank line:

1. **Tier 1: External NPM Packages** (`express`, `@prisma/client`, `zod`, `http-status-codes`, `@aws-sdk/client-s3`)
2. **Tier 2: Project Constants** (`ResponseMessages`, `ValidationMessages`, `StatusCodes`)
3. **Tier 3: Shared Helpers & Middlewares** (`ApiError`, `sendJsonResponse`, `validateRequest`, `uploadFor`, `getFileUrl`)
4. **Tier 4: Feature Modules, Services & Repositories** (`ProductService`, `ProductRepository`, `ProductController`)
5. **Tier 5: Configuration, Types & Environment** (`env`, `CreateProductInput`, `Express`)

### Example Import Block (Controller / Service / Repository)
```typescript
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ResponseMessages, ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { sendJsonResponse } from '../../../utils/response.util';
import { ProductService } from '../services/product.service';
import { CreateProductInput, UpdateProductInput } from '../types/product.types';
```

---

## 2. File Organization Rules

### A. Class-Based Controllers
- Class-based export using arrow function properties to ensure safe `this` context:
```typescript
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  getAllProducts = async (req: Request, res: Response): Promise<void> => {
    // ...
  };
}
```

### B. Class-Based Services
- Constructor-injected repository dependency:
```typescript
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async getProductById(productId: string) {
    // ...
  }
}
```

### C. Class-Based Repositories
- Constructor-injected PrismaClient instance:
```typescript
export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findProductById(productId: string) {
    // ...
  }
}
```

---

## 3. Formatting & Comment Standards

- **Single-Line Comments Only**: Use standard `//` comments.
- **NO Decorative Box Comments**: NEVER use `// ─── ... ───`, `// === ... ===`, or `// ___ ... ___`.
- **Prettier & ESLint Cleanliness**: Run `npm run lint:fix && npm run format` to enforce formatting compliance.
