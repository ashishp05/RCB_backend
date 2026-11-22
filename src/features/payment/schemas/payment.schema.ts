import { z } from 'zod';

import { onlinePaymentKindField } from '../../../utils/validators.util';

export const onlinePaymentMethod = onlinePaymentKindField;

export const createOrderSchema = z.object({
  bookingId: z.string().trim().min(1),
  method: onlinePaymentMethod,
});

export const paymentOrderMethodSchema = z.object({ method: onlinePaymentMethod });

// Counter desk: the booking id comes from the URL.
export const staffVerifyPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().trim().min(1),
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  // Mock mode accepts any value; real mode checks the HMAC.
  razorpaySignature: z.string().trim().min(1),
});
