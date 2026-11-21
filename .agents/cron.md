# Cron Job Management Standards

This document defines background task scheduling, concurrency locking, and execution timing standards for `node_prisma_boilerplate`.

---

## 1. Background Task Architecture

- Scheduled background jobs live in `src/cron/` or `src/jobs/`.
- Use `node-cron` or `@nestjs/schedule` for schedule registration.

---

## 2. Mandatory Rules for Cron Jobs

1. **Concurrency Overlap Locking**: Ensure background tasks do not execute concurrently if a previous iteration is still processing.
2. **Error Safety**: Wrap job execution handlers in `try/catch` blocks so background errors never crash the Node.js server process.
3. **Environment Control**: Disable background cron jobs during test execution (`NODE_ENV === 'test'`).
