import { z } from 'zod';

import {
  customersQuerySchema,
  sendOtpSchema,
  simpleLoginSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from '../schemas/visitor.schema';

export type SimpleLoginInput = z.infer<typeof simpleLoginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CustomersQuery = z.infer<typeof customersQuerySchema>;

export interface VisitorDto {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  // YYYY-MM-DD
  birthday: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface OtpSentDto {
  message: string;
  phone: string;
  // Seconds until the code stops working.
  expiresIn: number;
  // Seconds before another code can be requested.
  resendAfter: number;
  // Only outside production with the console SMS provider, so the flow can be tested.
  devCode?: string;
}

export interface VisitorSessionDto {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number | null;
  visitor: VisitorDto;
  // True when the visitor has no name yet: the app should ask for one (PATCH /visitors/me).
  needsName: boolean;
}

// Admin "Customers" row.
export interface CustomerDto {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  // Confirmed (upcoming + completed) bookings.
  count: number;
  totalSpent: number;
  firstSeen: Date;
  lastSeen: Date;
  lastBookingAt: Date | null;
}
