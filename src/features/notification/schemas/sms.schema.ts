import { z } from 'zod';

export const smsQuerySchema = z.object({
  bookingId: z.string().trim().min(1).optional(),
  recipient: z.enum(['customer', 'admin']).optional(),
  status: z.enum(['sent', 'failed', 'simulated']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
