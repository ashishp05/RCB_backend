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

// Admin "Customers" row (Flutter fields: name, phone, count, firstSeen, lastSeen).
export interface CustomerDto {
  id: string;
  name: string;
  phone: string;
  // Confirmed (upcoming + completed) bookings.
  count: number;
  totalSpent: number;
  firstSeen: Date;
  lastSeen: Date;
  lastBookingAt: Date | null;
}
