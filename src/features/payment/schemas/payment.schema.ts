import { z } from 'zod';

export const onlinePaymentMethod = z.enum(['upi_qr', 'credit_card', 'debit_card']);

export const createOrderSchema = z.object({
  bookingId: z.string().trim().min(1),
  method: onlinePaymentMethod,
});

export const paymentOrderMethodSchema = z.object({ method: onlinePaymentMethod });

export const verifyPaymentSchema = z.object({
  bookingId: z.string().trim().min(1),
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  // Mock mode accepts any value; real mode checks the HMAC.
  razorpaySignature: z.string().trim().min(1),
});
