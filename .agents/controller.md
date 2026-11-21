# Express 5 Controller Standards for TypeScript & Prisma

All controller modules in this project MUST adhere strictly to the rules and patterns defined below:

---

## 1. Directory & Naming Structure

- Store controllers inside feature directories under `src/features/<featureName>/controllers/<featureName>.controller.ts`.
- Class-based naming: `export class <Feature>Controller`.

---

## 2. Mandatory Rules for Controllers

### Rule 1: Dependency Injection via Constructor
- Controllers accept their feature service via constructor injection:
```typescript
export class UserController {
  constructor(private readonly userService: UserService) {}
}
```

### Rule 2: Arrow Function Action Handlers
- Handlers MUST be declared as arrow function property methods (`handlerName = async (req: Request, res: Response): Promise<void> => { ... }`) to bind `this` automatically when passed to Express route handlers.

### Rule 3: Express 5 Native Async Catching
- Express 5 natively catches unhandled promise rejections in async route handlers and forwards them to the global error middleware (`src/middleware/api-error.middleware.ts`).
- Controllers do **NOT** require redundant `try/catch` blocks unless performing explicit request file cleanup.

### Rule 4: Standard Response Envelope
- ALWAYS return HTTP responses using `sendJsonResponse`:
```typescript
sendJsonResponse(res, data, ResponseMessages.CREATED, StatusCodes.CREATED);
```

### Rule 5: Zero Hardcoded Messages & Statuses
- Use `ResponseMessages` and `ValidationMessages` from `src/constants/messages.ts`.
- Use `StatusCodes` from `http-status-codes`.

### Rule 6: File Upload Handling
- Extract single file uploaded path/URL from `(req as any).file?.url` or `(req as any).file?.localPath`.
- Extract array files from `(req as any).files`.

---

## 3. Standard Controller Action Sequence

Declare methods in this order:
1. **GetAll / List Handler** (`getAllProducts = async (req: Request, res: Response): Promise<void> => { ... }`)
2. **GetById Handler** (`getProductById = async (req: Request<{ id: string }>, res: Response): Promise<void> => { ... }`)
3. **Create Handler** (`createProduct = async (req: Request<{}, {}, CreateInput>, res: Response): Promise<void> => { ... }`)
4. **Update Handler** (`updateProduct = async (req: Request<{ id: string }, {}, UpdateInput>, res: Response): Promise<void> => { ... }`)
5. **Delete Handler** (`deleteProduct = async (req: Request<{ id: string }>, res: Response): Promise<void> => { ... }`)

---

## 4. Boilerplate Example

```typescript
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ResponseMessages } from '../../../constants/messages';
import { sendJsonResponse } from '../../../utils/response.util';
import { ProductService } from '../services/product.service';
import { CreateProductInput, UpdateProductInput } from '../types/product.types';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  getAllProducts = async (req: Request, res: Response): Promise<void> => {
    const filter = req.query as any;
    const result = await this.productService.getAllProducts(filter);
    sendJsonResponse(res, result, ResponseMessages.FETCHED, StatusCodes.OK);
  };

  getProductById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;
    const product = await this.productService.getProductById(id);
    sendJsonResponse(res, product, ResponseMessages.FETCHED, StatusCodes.OK);
  };

  createProduct = async (
    req: Request<{}, {}, CreateProductInput>,
    res: Response,
  ): Promise<void> => {
    const reqFiles = (req as any).files;
    const uploadedFiles = reqFiles && Array.isArray(reqFiles) ? reqFiles : [];
    const imageKeys = uploadedFiles.map((file: any) => file.url || file.localPath).filter(Boolean);

    const product = await this.productService.createProduct(req.body, imageKeys);
    sendJsonResponse(res, product, ResponseMessages.CREATED, StatusCodes.CREATED);
  };

  updateProduct = async (
    req: Request<{ id: string }, {}, UpdateProductInput>,
    res: Response,
  ): Promise<void> => {
    const { id } = req.params;
    let imageKeys: string[] | undefined;
    const reqFiles = (req as any).files;
    if (reqFiles && Array.isArray(reqFiles) && reqFiles.length > 0) {
      imageKeys = reqFiles.map((file: any) => file.url || file.localPath).filter(Boolean);
    }

    const updated = await this.productService.updateProduct(id, req.body, imageKeys);
    sendJsonResponse(res, updated, ResponseMessages.UPDATED, StatusCodes.OK);
  };

  deleteProduct = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;
    const deleted = await this.productService.deleteProduct(id);
    sendJsonResponse(res, deleted, ResponseMessages.DELETED, StatusCodes.OK);
  };
}
```
