import assert from 'node:assert/strict';
import { test } from 'node:test';

import { policyRefundPaise } from '../features/booking/services/booking.service';

// App FAQ: full refund up to 24 hours before the slot and 50% up to 6 hours before.
test('refund tiers', () => {
  assert.equal(policyRefundPaise(92_000, 48), 92_000);
  assert.equal(policyRefundPaise(92_000, 24), 92_000);
  assert.equal(policyRefundPaise(92_000, 23.9), 46_000);
  assert.equal(policyRefundPaise(92_000, 6), 46_000);
  assert.equal(policyRefundPaise(92_000, 5.9), 0);
  assert.equal(policyRefundPaise(0, 48), 0);
});
