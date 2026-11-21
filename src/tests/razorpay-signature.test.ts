import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';

import { env } from '../config/env-config';
import { RazorpayClient } from '../utils/razorpay.util';

// Exercise the real (non-mock) HMAC checks with test secrets.
Object.assign(env, {
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'test_secret',
  RAZORPAY_WEBHOOK_SECRET: 'webhook_secret',
});
const client = new RazorpayClient();

test('payment signature: HMAC(order_id|payment_id, key_secret)', () => {
  const signature = crypto
    .createHmac('sha256', 'test_secret')
    .update('order_1|pay_1')
    .digest('hex');
  assert.equal(client.isMock(), false);
  assert.equal(client.verifyPaymentSignature('order_1', 'pay_1', signature), true);
  assert.equal(client.verifyPaymentSignature('order_1', 'pay_2', signature), false);
  assert.equal(client.verifyPaymentSignature('order_1', 'pay_1', 'garbage'), false);
});

test('webhook signature is computed over the raw body', () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = crypto.createHmac('sha256', 'webhook_secret').update(body).digest('hex');
  assert.equal(client.verifyWebhookSignature(body, signature), true);
  assert.equal(client.verifyWebhookSignature(Buffer.from('{"event":"x"}'), signature), false);
  assert.equal(client.verifyWebhookSignature(body, undefined), false);
});
