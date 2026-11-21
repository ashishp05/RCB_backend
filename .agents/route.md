# Express Route Architecture Standards

All routes in `node_prisma_boilerplate` MUST follow the modular feature route standards defined below:

---

## 1. Directory & Routing Architecture

- Feature routes live in `src/features/<featureName>/routes/<featureName>.routes.ts`.
- Master router registration lives in `src/routes/routes.ts`.

---

## 2. Standard Middleware Pipeline Sequence

Every route definition MUST follow this exact middleware execution sequence:

```
[HTTP Method] → Router → [Auth Middleware] → [Media Upload] → [Validation Middleware] → [Controller Action]
```

1. **Auth Middleware**: `auth` (verifies JWT token and attaches `req.userId` & `req.user`).
2. **Media Middleware**: `uploadFor('folder', options).single('field')` / `.array('field', count)`.
3. **Validation Middleware**: `validateQuery(querySchema)` for URL query params or `validateRequest(bodySchema)` for HTTP body payloads.
4. **Controller Action Handler**: Invokes class controller action (e.g. `productController.createProduct`).

---

## 3. Mandatory 5-Step CRUD Route Ordering

Routes inside `*.routes.ts` MUST be declared in this exact order:

1. **List / Query Route**: `router.get('/', validateQuery(...), controller.getAll)`
2. **Get Info By ID Route**: `router.get('/:id', controller.getById)`
3. **Create / Add Route**: `router.post('/', uploadFor(...), validateRequest(...), controller.create)`
4. **Update Route**: `router.put('/:id', uploadFor(...), validateRequest(...), controller.update)`
5. **Delete Route**: `router.delete('/:id', controller.delete)`

---

## 4. Route Boilerplate Example

```typescript
import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { uploadFor } from '../../../middleware/upload.middleware';
import { validateQuery, validateRequest } from '../../../middleware/validation.middleware';
import { ProductController } from '../controllers/product.controller';
import { ProductRepository } from '../repositories/product.repository';
import {
  createProductSchema,
  getProductQuerySchema,
  updateProductSchema,
} from '../schemas/product.schema';
import { ProductService } from '../services/product.service';

const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;
const productRepository = new ProductRepository(prisma);
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);

const router = Router();

const productMediaUpload = uploadFor('products/gallery', {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
});

router.get('/', validateQuery(getProductQuerySchema), productController.getAllProducts);
router.get('/:id', productController.getProductById);

router.post(
  '/',
  productMediaUpload.array('images', 10),
  validateRequest(createProductSchema),
  productController.createProduct,
);

router.put(
  '/:id',
  productMediaUpload.array('images', 10),
  validateRequest(updateProductSchema),
  productController.updateProduct,
);

router.delete('/:id', productController.deleteProduct);

export default router;
```
