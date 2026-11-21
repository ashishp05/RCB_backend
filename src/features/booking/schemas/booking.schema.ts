import { z } from 'zod';

import { BOOKING_RULES } from '../../../constants/config.constants';
import {
  dateField,
  hourField,
  hoursField,
  nameField,
  offerCodeField,
  paymentKindField,
  phoneField,
} from '../../../utils/validators.util';

const paymentKind = paymentKindField;
const bookingStatus = z.enum(['upcoming', 'pending', 'completed', 'cancelled']);
const bookingChannel = z.enum(['self', 'counter']);

const players = z.coerce.number().int().min(1).max(BOOKING_RULES.MAX_PLAYERS).optional();
const notes = z.string().trim().max(500).optional();
const reason = z.string().trim().max(300).optional();

export const createHoldSchema = z.object({
  venueId: z.string().trim().min(1).optional(),
  pitchId: z.string().trim().min(1).optional(),
  date: dateField,
  hours: hoursField,
  phone: phoneField.optional(),
});

export const pricePreviewSchema = z.object({
  venueId: z.string().trim().min(1).optional(),
  hours: z.coerce.number().int().min(1).max(24),
  // Optional: weekday-only offers are judged on the booked date; startHour fills price.lines.
  date: dateField.optional(),
  startHour: hourField.optional(),
  offerCode: offerCodeField,
});

export const createBookingSchema = z.object({
  holdId: z.string().trim().min(1),
  customerName: nameField,
  customerPhone: phoneField,
  players,
  notes,
  // Counter bookings go through /admin/bookings; the public site is always "self".
  channel: z.literal('self').default('self'),
  offerCode: offerCodeField,
});

export const customerBookingsQuerySchema = z.object({ phone: phoneField });

// The mobile number proves the caller owns the booking (soft visitor identity).
export const cancelBookingSchema = z.object({ phone: phoneField, reason });

export const rescheduleBookingSchema = z.object({
  phone: phoneField,
  date: dateField,
  startHour: hourField,
});

export const adminCreateBookingSchema = z.object({
  venueId: z.string().trim().min(1).optional(),
  pitchId: z.string().trim().min(1).optional(),
  date: dateField,
  hours: hoursField,
  customerName: nameField,
  customerPhone: phoneField,
  paymentKind,
  paymentMethodLabel: z.string().trim().max(60).optional(),
  players,
  notes,
  offerCode: offerCodeField,
});

export const adminBookingsQuerySchema = z.object({
  venueId: z.string().trim().min(1).optional(),
  // "All bookings" tabs: upcoming = upcoming/pending (soonest first), past = completed/cancelled.
  time: z.enum(['all', 'upcoming', 'past']).default('all'),
  // "Filter by date" (single day). from/to give a range.
  date: dateField.optional(),
  from: dateField.optional(),
  to: dateField.optional(),
  status: bookingStatus.optional(),
  channel: bookingChannel.optional(),
  paymentKind: paymentKind.optional(),
  pitchId: z.string().trim().min(1).optional(),
  phone: z.string().trim().max(15).optional(),
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

export const adminCancelBookingSchema = z.object({
  reason,
  // Rupees. Defaults to the cancellation policy when omitted.
  refundAmount: z.coerce.number().min(0).optional(),
});

export const adminRescheduleBookingSchema = z.object({
  date: dateField,
  startHour: hourField,
  pitchId: z.string().trim().min(1).optional(),
});

export const paymentFailedSchema = z.object({ reason: reason });

export const markPaidSchema = z.object({
  paymentKind: paymentKind.optional(),
  paymentMethodLabel: z.string().trim().max(60).optional(),
});
