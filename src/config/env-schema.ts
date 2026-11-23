import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST_URL: z.string().optional(),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  VISITOR_JWT_EXPIRES_IN: z.string().default('30d'),
  CUSTOMER_LOGIN_MODE: z.enum(['simple', 'otp']).default('simple'),
  WHITE_LIST_URLS: z
    .string()
    .transform(value => value.split(',').map(url => url.trim()))
    .refine(urls => urls.every(url => z.string().url().safeParse(url).success), {
      message: 'Each value in WHITE_LIST_URLS must be a valid URL',
    }),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SENDER_NAME: z.string().optional().default('Node With Prisma'),
  DISABLE_EMAIL: z
    .string()
    .optional()
    .transform(val => val === 'true')
    .default(false),
  USE_S3: z
    .string()
    .optional()
    .transform(val => val === 'true')
    .default(false),
  AWS_REGION: z.string().optional().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform(val => val === 'true')
    .default(false),
  DEFAULT_VENUE_ID: z.string().default('arena'),
  PUBLIC_SITE_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_PANEL_URL: z.string().url().optional(),
  ADMIN_SEED_NAME: z.string().default('Venue Admin'),
  ADMIN_SEED_EMAIL: z.string().email().default('admin.rcb@yopmail.com'),
  ADMIN_SEED_PASSWORD: z
    .string()
    .min(8, 'ADMIN_SEED_PASSWORD must be at least 8 characters')
    .default('Admin@123'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  UPI_VPA: z.string().optional(),
  UPI_PAYEE_NAME: z.string().default('The Riverside Cricket Box'),
  SMS_PROVIDER: z.enum(['msg91', 'twilio', 'console']).default('console'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_TEMPLATE_CUSTOMER: z.string().optional(),
  MSG91_TEMPLATE_ADMIN: z.string().optional(),
  MSG91_TEMPLATE_OTP: z.string().optional(),
  MSG91_TEMPLATE_CANCELLED: z.string().optional(),
  MSG91_TEMPLATE_RESCHEDULED: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  ADMIN_NOTIFY_PHONE: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;
