# Constants & Enum Standards

All response messages, validation errors, and domain enums MUST be defined centrally in `src/constants/messages.ts` or feature-level `types`.

---

## 1. Zero Hardcoded String Literals Rule

- NEVER hardcode user-facing success or error message strings directly in controllers, services, repositories, or middlewares.
- All HTTP success messages MUST use `ResponseMessages`.
- All client-facing error messages MUST use `ValidationMessages`.
- Developer/system logs (`console.log`, `console.error`) remain plain developer strings and must NOT be put into `ValidationMessages`.

---

## 2. Response & Validation Messages Structure (`src/constants/messages.ts`)

```typescript
export const ResponseMessages = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  FETCHED: 'Fetched successfully',
  LOGIN_SUCCESSFUL: 'Login successful',
  REGISTRATION_SUCCESSFUL: 'Registration successful',
  PROFILE_FETCH_SUCCESS: 'Profile fetched successfully',
  PROFILE_UPDATED_SUCCESS: 'Profile updated successfully',
} as const;

export const ValidationMessages = {
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_TOKEN: 'Invalid or expired token',
  PRODUCT_NOT_FOUND: 'Product not found',
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  INVALID_CREDENTIALS: 'Invalid email or password',

  // Dynamic helper messages
  required: (field: string) => `${field} is required`,
  notFound: (entity: string) => `${entity} not found`,
  alreadyExists: (entity: string) => `${entity} already exists`,
  invalidFileType: (field: string, allowed: string) =>
    `Invalid file type for '${field}'. Allowed types: ${allowed}`,
  fileSizeExceeded: (field: string, maxSizeMB: string) =>
    `File size for '${field}' exceeds maximum limit of ${maxSizeMB}MB`,
  uploadError: (message: string) => `File upload failed: ${message}`,
} as const;
```

---

## 3. TypeScript Enums

Domain enums (such as User roles, Order status, etc.) MUST be defined as TypeScript `enum` or `as const` objects:

```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
```
