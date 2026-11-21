import { BookingChannel, BookingStatus, PaymentKind, Prisma } from '@prisma/client';
import { z } from 'zod';

import {
  adminBookingsQuerySchema,
  adminCancelBookingSchema,
  adminCreateBookingSchema,
  adminRescheduleBookingSchema,
  cancelBookingSchema,
  createBookingSchema,
  createHoldSchema,
  customerBookingsQuerySchema,
  markPaidSchema,
  paymentFailedSchema,
  pricePreviewSchema,
  rescheduleBookingSchema,
} from '../schemas/booking.schema';

export type CreateHoldInput = z.infer<typeof createHoldSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CustomerBookingsQuery = z.infer<typeof customerBookingsQuerySchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type PricePreviewInput = z.infer<typeof pricePreviewSchema>;
export type AdminCreateBookingInput = z.infer<typeof adminCreateBookingSchema>;
export type AdminBookingsQuery = z.infer<typeof adminBookingsQuerySchema>;
export type AdminCancelBookingInput = z.infer<typeof adminCancelBookingSchema>;
export type AdminRescheduleBookingInput = z.infer<typeof adminRescheduleBookingSchema>;
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
export type PaymentFailedInput = z.infer<typeof paymentFailedSchema>;

export type OnlinePaymentKind = Exclude<PaymentKind, 'cash'>;

// Stored in bookings.price_json. All amounts in paise.
export interface PriceSnapshot {
  hours: number;
  hourlyRatePaise: number;
  subtotalPaise: number;
  discountPaise: number;
  platformFeePaise: number;
  gstRateBps: number;
  taxesPaise: number;
  totalPaise: number;
  couponCode: string | null;
}

// API shape (rupees), matching the Flutter price model.
export interface PriceLineDto {
  hour: number;
  amount: number;
  isPeak: boolean;
}

export interface PriceDto {
  // One line per booked hour (Flutter quote model). Empty for previews without a start hour.
  lines: PriceLineDto[];
  subtotal: number;
  discount: number;
  platformFee: number;
  taxes: number;
  total: number;
  hourlyRate: number;
  hours: number;
  gstRate: number;
  couponCode: string | null;
}

export const bookingInclude = Prisma.validator<Prisma.BookingInclude>()({
  venue: { select: { name: true, area: true } },
  pitch: { select: { name: true } },
});

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export interface BookingDto {
  id: string;
  venueId: string;
  venueName: string;
  venueArea: string;
  pitchId: string;
  pitchName: string;
  date: string;
  startHour: number;
  endHour: number;
  hours: number;
  slotLabel: string;
  status: BookingStatus;
  channel: BookingChannel;
  paymentKind: PaymentKind | null;
  // Human label, e.g. "Cash" or "UPI QR". paymentMethod is the Flutter field name.
  paymentMethod: string | null;
  paymentMethodLabel: string | null;
  createdBy: 'guest' | 'staff';
  price: PriceDto;
  customerName: string;
  customerPhone: string;
  staffId: string | null;
  players: number | null;
  notes: string | null;
  refundAmount: number | null;
  cancelReason: string | null;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

export interface NewBookingData {
  id: string;
  venueId: string;
  pitchId: string;
  date: string;
  startHour: number;
  hours: number;
  status: BookingStatus;
  channel: BookingChannel;
  paymentKind: PaymentKind | null;
  paymentMethodLabel: string | null;
  price: PriceSnapshot;
  customerName: string;
  customerPhone: string;
  staffId: string | null;
  players: number | null;
  notes: string | null;
  expiresAt: Date | null;
  confirmedAt: Date | null;
}
