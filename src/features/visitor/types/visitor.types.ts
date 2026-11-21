import { z } from 'zod';

import {
  customersQuerySchema,
  upsertVisitorSchema,
  visitorLookupQuerySchema,
} from '../schemas/visitor.schema';

export type UpsertVisitorInput = z.infer<typeof upsertVisitorSchema>;
export type VisitorLookupQuery = z.infer<typeof visitorLookupQuerySchema>;
export type CustomersQuery = z.infer<typeof customersQuerySchema>;

export interface VisitorDto {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface CustomerDto extends VisitorDto {
  bookingsCount: number;
  totalSpent: number;
  lastBookingAt: Date | null;
}
