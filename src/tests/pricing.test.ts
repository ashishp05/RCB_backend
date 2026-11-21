import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Offer } from '@prisma/client';

import { calculatePrice, toPriceDto } from '../features/booking/services/pricing.service';

const offer = (overrides: Partial<Offer>): Offer => ({
  id: 'o1',
  venueId: 'arena',
  code: 'RIVER50',
  title: 'Riverside special',
  description: '',
  kind: 'flat',
  value: 5_000,
  maxDiscountPaise: null,
  minSubtotalPaise: 0,
  minHours: 1,
  weekdaysOnly: false,
  accent: 'amber',
  active: true,
  validFrom: null,
  validTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const base = { hourlyRatePaise: 90_000, additionalChargePaise: 2_000, gstRateBps: 0 };

test('contract example: 2h at 900 + 20 fee - RIVER50 = 1770', () => {
  const price = toPriceDto(calculatePrice({ ...base, hours: 2, offer: offer({}) }));
  assert.deepEqual(price, {
    lines: [],
    subtotal: 1800,
    discount: 50,
    platformFee: 20,
    taxes: 0,
    total: 1770,
    hourlyRate: 900,
    hours: 2,
    gstRate: 0,
    couponCode: 'RIVER50',
  });
});

test('no offer: 900 + 20 = 920', () => {
  assert.equal(calculatePrice({ ...base, hours: 1 }).totalPaise, 92_000);
});

test('GST applies after discount and includes the platform fee', () => {
  const price = calculatePrice({ ...base, hours: 1, gstRateBps: 1800 });
  assert.equal(price.taxesPaise, 16_560); // 18% of 920
  assert.equal(price.totalPaise, 108_560);
});

test('percent offer respects its cap', () => {
  const price = calculatePrice({
    ...base,
    hours: 2,
    offer: offer({ kind: 'percent', value: 1000, maxDiscountPaise: 10_000 }),
  });
  assert.equal(price.discountPaise, 10_000);
});

test('discount never exceeds the subtotal', () => {
  const price = calculatePrice({ ...base, hours: 1, offer: offer({ value: 500_000 }) });
  assert.equal(price.discountPaise, 90_000);
  assert.equal(price.totalPaise, 2_000);
});

test('price lines list each booked hour', () => {
  const price = toPriceDto(calculatePrice({ ...base, hours: 2 }), 19);
  assert.deepEqual(price.lines, [
    { hour: 19, amount: 900, isPeak: false },
    { hour: 20, amount: 900, isPeak: false },
  ]);
});
