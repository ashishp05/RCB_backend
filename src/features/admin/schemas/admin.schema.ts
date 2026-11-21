import { z } from 'zod';

import { dateField } from '../../../utils/validators.util';

export const staffLoginSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});

export const dashboardQuerySchema = z.object({
  venueId: z.string().trim().min(1).optional(),
  date: dateField.optional(),
});
