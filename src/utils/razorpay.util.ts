import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';

import { env } from '../config/env-config';
import { CURRENCY } from '../constants/config.constants';
import { ValidationMessages } from '../constants/messages';
import { ApiError } from './api-error.util';
import { generatePrefixedId } from './id.util';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface RazorpayRefund {
  id: string;
  amount: number;
}

const hmacHex = (secret: string, payload: string | Buffer): string =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

const safeEqualHex = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Thin Razorpay REST client. Without keys (and outside production) it runs in mock mode so the
// whole booking flow can be exercised locally: orders get fake ids and any signature verifies.
export class RazorpayClient {
  isConfigured(): boolean {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  }

  isMock(): boolean {
    return !this.isConfigured() && env.NODE_ENV !== 'production';
  }

  keyId(): string {
    return env.RAZORPAY_KEY_ID || 'rzp_test_mock';
  }

  private assertAvailable(): void {
    if (!this.isConfigured() && !this.isMock()) {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        ValidationMessages.PAYMENT_NOT_CONFIGURED,
      );
    }
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString(
      'base64',
    );
    const response = await fetch(`${RAZORPAY_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      console.error('Razorpay API error', response.status, json);
      throw new ApiError(StatusCodes.BAD_GATEWAY, ValidationMessages.PAYMENT_PROVIDER_ERROR);
    }
    return json as T;
  }

  async createOrder(
    amountPaise: number,
    receipt: string,
    notes: Record<string, string>,
  ): Promise<RazorpayOrder> {
    this.assertAvailable();
    if (this.isMock()) {
      return { id: generatePrefixedId('order_mock'), amount: amountPaise, currency: CURRENCY };
    }
    return this.request<RazorpayOrder>('/orders', {
      amount: amountPaise,
      currency: CURRENCY,
      receipt,
      notes,
    });
  }

  async refund(paymentId: string, amountPaise: number): Promise<RazorpayRefund> {
    this.assertAvailable();
    if (this.isMock() || paymentId.startsWith('pay_mock')) {
      return { id: generatePrefixedId('rfnd_mock'), amount: amountPaise };
    }
    return this.request<RazorpayRefund>(`/payments/${paymentId}/refund`, {
      amount: amountPaise,
    });
  }

  // Checkout success handler signature: HMAC_SHA256(order_id|payment_id, key_secret).
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (this.isMock()) return true;
    if (!env.RAZORPAY_KEY_SECRET) return false;
    return safeEqualHex(hmacHex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);
  }

  // Webhook signature: HMAC_SHA256(raw body, webhook secret).
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) return this.isMock();
    if (!signature) return false;
    return safeEqualHex(hmacHex(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
  }
}

// UPI deep link for the on-screen QR. Requires UPI_VPA; returns null otherwise.
export const buildUpiQrString = (
  amountPaise: number,
  reference: string,
  note: string,
): string | null => {
  if (!env.UPI_VPA) return null;
  const params = new URLSearchParams({
    pa: env.UPI_VPA,
    pn: env.UPI_PAYEE_NAME,
    am: (amountPaise / 100).toFixed(2),
    cu: CURRENCY,
    tr: reference,
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
};

export const razorpayClient = new RazorpayClient();
