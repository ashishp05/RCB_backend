# Postman Collection & API Documentation Standards

This document describes how API routes in `node_prisma_boilerplate` are documented and tested using Postman collections and cURL commands.

---

## 1. Postman Collection Structure

Store Postman environment and collection exports under `postman/`:
```
postman/
├── node_prisma_boilerplate.postman_collection.json
└── node_prisma_boilerplate.postman_environment.json
```

---

## 2. API cURL Documentation Guidelines

For each feature, provide standard cURL examples covering all CRUD endpoints:

### Example: Product List API (`GET /api/v1/products`)
```bash
curl --location 'http://localhost:8080/api/v1/products?limit=10&skip=0&sortKey=price&sortOrder=asc&needCount=true' \
--header 'Authorization: Bearer <YOUR_JWT_TOKEN>'
```

### Example: Product Create API with Multi-Image Upload (`POST /api/v1/products`)
```bash
curl --location 'http://localhost:8080/api/v1/products' \
--header 'Authorization: Bearer <YOUR_JWT_TOKEN>' \
--form 'name="Galaxy 101"' \
--form 'price="1000"' \
--form 'stock="10"' \
--form 'categoryId="5e3b3402-ac96-4e2d-843e-e715b5a30774"' \
--form 'images=@"/path/to/image1.jpg"' \
--form 'images=@"/path/to/image2.jpg"'
```
