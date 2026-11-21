# Prisma Schema & Repository Layer Standards

This document specifies database schema definition rules in `prisma/schema.prisma` and Repository layer implementation rules in `src/features/<feature>/repositories/`.

---

## 1. Prisma Schema Standards (`prisma/schema.prisma`)

1. **Primary Keys**: Always use `id String @id @default(uuid())`.
2. **Timestamps**: Always include `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
3. **Soft Delete / Status**: Use `active Boolean @default(true)` or explicit Status enums where required.
4. **Relations**: Define explicit `@relation(fields: [...], references: [id])`.
5. **Format & Generate**: Always run `npx prisma format` and `npx prisma generate` after modifying `schema.prisma`.

---

## 2. Repository Layer Standards (`*.repository.ts`)

- Store repository files at `src/features/<featureName>/repositories/<featureName>.repository.ts`.
- Export class naming: `export class <Feature>Repository`.
- Constructor receives `PrismaClient` instance:
  ```typescript
  export class ProductRepository {
    constructor(private readonly prisma: PrismaClient) {}
  }
  ```

---

## 3. Boilerplate Repository Example

```typescript
import { PrismaClient } from '@prisma/client';

import {
  CreateProductInput,
  ProductQueryFilterInput,
  UpdateProductInput,
} from '../types/product.types';

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllProducts(filter: Partial<ProductQueryFilterInput> = {}) {
    const {
      limit = 10,
      skip = 0,
      searchTerm,
      sortKey = 'createdAt',
      sortOrder = 'desc',
      needCount = false,
    } = filter;

    const where: any = {
      ...(searchTerm
        ? {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [total, records] = await Promise.all([
      needCount ? this.prisma.product.count({ where }) : Promise.resolve(undefined),
      this.prisma.product.findMany({
        where,
        take: limit > 0 ? limit : undefined,
        skip: skip > 0 ? skip : undefined,
        orderBy: {
          [sortKey]: sortOrder,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return { total, records };
  }

  async findProductById(productId: string) {
    return this.prisma.product.findFirst({
      where: { id: productId },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async createProduct(data: CreateProductInput, images: string[] = []) {
    const createData: any = {
      ...data,
      images,
    };

    return this.prisma.product.create({
      data: createData,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateProduct(productId: string, data: UpdateProductInput, images?: string[]) {
    const updateData: any = {
      ...data,
      ...(images ? { images } : {}),
    };

    return this.prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteProduct(productId: string) {
    return this.prisma.product.delete({
      where: { id: productId },
    });
  }
}
```
