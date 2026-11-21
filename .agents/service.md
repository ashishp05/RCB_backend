# Feature Service Standards for TypeScript & Prisma

Services in `node_prisma_boilerplate` encapsulate domain business logic and sit between Controllers and Repositories.

---

## 1. Directory & Class Structure

- Location: `src/features/<featureName>/services/<featureName>.service.ts`.
- Export class naming: `export class <Feature>Service`.
- Repository dependency injection via constructor.

```typescript
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}
}
```

---

## 2. Core Service Rules

### Rule 1: Repository Delegation
- Services NEVER execute Prisma queries directly. All database access is delegated to the injected `Repository`.

### Rule 2: Operational Error Handling
- Throw `ApiError(StatusCodes.NOT_FOUND / BAD_REQUEST, ValidationMessages.<Message>)` when entities are not found or business rules fail.
- Do NOT return `{ success: false }` or null objects for missing resources; throw an `ApiError` so `api-error.middleware.ts` catches and formats the HTTP error envelope.

### Rule 3: File Lifecycle Management
- When replacing or deleting files, retrieve the existing entity first.
- Call `deleteFile(oldPath)` from `src/utils/file-upload.util.ts` to remove replaced/deleted images from S3 or local disk.

### Rule 4: URL Formatting Helper
- Map relative file keys stored in PostgreSQL to full accessible URLs using `getFileUrl()` from `src/utils/file-upload.util.ts`.

---

## 3. Boilerplate Example

```typescript
import { StatusCodes } from 'http-status-codes';

import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { deleteFile, getFileUrl } from '../../../utils/file-upload.util';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductInput, ProductQueryFilterInput, UpdateProductInput } from '../types/product.types';

const formatProductImageUrls = (product: any) => {
  if (!product) return null;
  const imageKeys: string[] = Array.isArray(product.images) ? product.images : [];
  const imageUrls = imageKeys
    .map(key => getFileUrl(key))
    .filter((url): url is string => url !== null);

  return {
    ...product,
    imageUrls,
  };
};

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async getAllProducts(filter: Partial<ProductQueryFilterInput> = {}) {
    const { total, records } = await this.productRepository.findAllProducts(filter);
    const formattedRecords = records.map(product => formatProductImageUrls(product));

    return {
      ...(total !== undefined ? { total } : {}),
      records: formattedRecords,
    };
  }

  async getProductById(productId: string) {
    const product = await this.productRepository.findProductById(productId);
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.PRODUCT_NOT_FOUND);
    }
    return formatProductImageUrls(product);
  }

  async createProduct(data: CreateProductInput, imageKeys: string[] = []) {
    const product = await this.productRepository.createProduct(data, imageKeys);
    return formatProductImageUrls(product);
  }

  async updateProduct(productId: string, data: UpdateProductInput, imageKeys?: string[]) {
    const existing = await this.productRepository.findProductById(productId);
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.PRODUCT_NOT_FOUND);
    }

    const existingImages = (existing as any).images;
    if (imageKeys && Array.isArray(existingImages)) {
      existingImages.forEach((oldKey: string) => {
        void deleteFile(oldKey);
      });
    }

    const updated = await this.productRepository.updateProduct(productId, data, imageKeys);
    return formatProductImageUrls(updated);
  }

  async deleteProduct(productId: string) {
    const existing = await this.productRepository.findProductById(productId);
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.PRODUCT_NOT_FOUND);
    }

    const existingImages = (existing as any).images;
    if (Array.isArray(existingImages)) {
      existingImages.forEach((key: string) => {
        void deleteFile(key);
      });
    }

    return this.productRepository.deleteProduct(productId);
  }
}
```
