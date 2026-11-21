import { z } from 'zod';

import { nameField, phoneField } from '../../../utils/validators.util';

export const upsertVisitorSchema = z.object({ name: nameField, phone: phoneField });

export const visitorLookupQuerySchema = z.object({ phone: phoneField });

export const customersQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
