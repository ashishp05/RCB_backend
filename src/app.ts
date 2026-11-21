import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import path from 'path';

import { env } from './config/env-config';
import { apiErrorHandler, unmatchedRoutes } from './middleware/api-error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { rateLimiter } from './middleware/security.middleware';
import router from './routes/routes';

const app: Application = express();

// Request Logger
app.use(requestLogger);

// Trust reverse proxy (e.g., ngrok, Nginx, Cloudflare, AWS ALB) for rate limiting & IP detection
app.set('trust proxy', 1);

const isDevelopment = env.NODE_ENV === 'development';
const allowedURLs = env.WHITE_LIST_URLS || [];

// CORS must be first so preflight OPTIONS and error responses have CORS headers
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        isDevelopment ||
        allowedURLs.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['X-Total-Count'],
  }),
);

// Security middleware
app.use(rateLimiter);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// Razorpay webhooks are signed over the raw bytes, so keep that body unparsed.
app.use('/api/v1/payments/razorpay/webhook', express.raw({ type: '*/*', limit: '1mb' }));

// Global Middlewares
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (req: Request, res: Response): void => {
  res.json({ success: true, message: 'ok' });
  return;
});

app.get('/heartbeat', (req: Request, res: Response): void => {
  res.send('ok');
  return;
});

// API Routes
app.use('/api/v1', router);

// Error handling (ApiError, Zod/JSON errors, Prisma errors)
app.use(apiErrorHandler);

// Middleware for handling unmatched routes
app.use(unmatchedRoutes);

export { app };
