import { z } from 'zod';

import { createOrderSchema, verifyPaymentSchema } from '../schemas/payment.schema';

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export interface PaymentOrderDto {
  bookingId: string;
  orderId: string;
  // Paise, as Razorpay Checkout expects.
  amount: number;
  currency: string;
  keyId: string;
  qrString: string | null;
  method: string;
  mock: boolean;
}

export interface RazorpayWebhookEvent {
  event: string;
  payload?: {
    payment?: {
      entity?: { id: string; order_id: string; amount: number; method?: string; status?: string };
    };
  };
}
