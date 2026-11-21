import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDaysToDate,
  formatSlotRange,
  isValidDateString,
  slotStartInstant,
  todayInVenue,
} from '../utils/time.util';

test('slot start is interpreted in IST', () => {
  assert.equal(slotStartInstant('2026-03-22', 19).toISOString(), '2026-03-22T13:30:00.000Z');
  assert.equal(slotStartInstant('2026-03-22', 0).toISOString(), '2026-03-21T18:30:00.000Z');
});

test('today follows IST, not UTC', () => {
  // 20:00 UTC is already the next day in India.
  assert.equal(todayInVenue(new Date('2026-03-21T20:00:00Z')), '2026-03-22');
});

test('date validation rejects impossible dates', () => {
  assert.equal(isValidDateString('2026-02-28'), true);
  assert.equal(isValidDateString('2026-02-30'), false);
  assert.equal(isValidDateString('22-03-2026'), false);
});

test('date arithmetic and labels', () => {
  assert.equal(addDaysToDate('2026-12-31', 1), '2027-01-01');
  assert.equal(formatSlotRange(19, 2), '7 PM - 9 PM');
  assert.equal(formatSlotRange(23, 1), '11 PM - 12 AM');
});
