# Helper & Utility Layer Architecture

All 3rd-party packages and cross-cutting infrastructure concerns in `node_prisma_boilerplate` MUST be encapsulated inside helper utilities in `src/utils/` and `src/middleware/`.

---

## 1. "Helper First" Isolation Pattern

- Controllers and Services must NEVER interact directly with 3rd-party SDKs (AWS SDK, Nodemailer, Handlebars, JWT, Multer).
- All 3rd-party SDK interactions must be wrapped inside dedicated utility helpers in `src/utils/`.

---

## 2. Inventory of Utilities & Helpers

| Helper File | Primary Responsibility | Key Functions / Classes |
| :--- | :--- | :--- |
| **`src/utils/s3.util.ts`** | AWS SDK v3 S3 Cloud Storage | `S3Service`, `uploadFile`, `deleteFile`, `deleteMultipleFiles`, `getSignedDownloadUrl` |
| **`src/utils/local-storage.util.ts`** | Local Disk Media Engine | `uploadLocalFile`, `deleteLocalFile`, `getLocalFileUrl` |
| **`src/utils/file-upload.util.ts`** | Storage Facade (`USE_S3` Router) | `handleFileUpload`, `handleMultipleFilesUpload`, `deleteFile`, `getFileUrl`, `removeUploadedFilesOnError` |
| **`src/utils/email.service.ts`** | Nodemailer Transporter | `sendMail({ to, subject, html })` |
| **`src/utils/email.helper.ts`** | Handlebars Email Template Engine | `sendUserInvitationEmail`, `sendForgotPasswordEmail` |
| **`src/utils/api-error.util.ts`** | Centralized Operational Error Class | `export class ApiError extends Error { statusCode, message }` |
| **`src/utils/response.util.ts`** | Standard HTTP Envelope Helper | `sendJsonResponse(res, data, message, statusCode)` |
| **`src/utils/generate-token.util.ts`** | JWT Token Generation | `generateToken(userId, expiresIn)` |

---

## 3. Storage Facade Flow

```
Client Upload Request
        │
        ▼
Multer Memory Storage (upload.middleware.ts)
        │
        ▼
Storage Facade (file-upload.util.ts)
        │
   ┌────┴────────────────────────┐
   │ env.USE_S3 === true         │ env.USE_S3 === false
   ▼                             ▼
AWS S3 Client (s3.util.ts)    Local Disk Engine (local-storage.util.ts)
   │                             │
   ▼                             ▼
S3 Object Path                /uploads/<folder>/<filename>
```
