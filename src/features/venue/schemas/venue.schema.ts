import { z } from 'zod';

import { OfferAccents } from '../../../constants/config.constants';
import { dateField } from '../../../utils/validators.util';

export const slotsQuerySchema = z.object({
  date: dateField,
  pitchId: z.string().trim().min(1).optional(),
});

const rupees = z.coerce.number().min(0).max(1_000_000);

export const updateSettingsSchema = z
  .object({
    hourlyRate: rupees.optional(),
    additionalCharge: rupees.optional(),
    // Percent, e.g. 18 for 18% GST. 0 turns GST off.
    gstRate: z.coerce.number().min(0).max(28).optional(),
    openHour: z.coerce.number().int().min(0).max(23).optional(),
    closeHour: z.coerce.number().int().min(1).max(24).optional(),
    minHours: z.coerce.number().int().min(1).max(24).optional(),
    maxHours: z.coerce.number().int().min(1).max(24).optional(),
    advanceDays: z.coerce.number().int().min(0).max(365).optional(),
  })
  .refine(data => Object.keys(data).length > 0, 'Provide at least one setting to update');

const offerBase = {
  title: z.string().trim().max(60).optional(),
  description: z.string().trim().max(200).optional(),
  kind: z.enum(['flat', 'percent']),
  // flat: rupees off. percent: percent off (10 = 10%).
  value: z.coerce.number().positive(),
  maxDiscount: z.coerce.number().positive().nullable().optional(),
  minSubtotal: z.coerce.number().min(0).optional(),
  minHours: z.coerce.number().int().min(1).max(24).optional(),
  weekdaysOnly: z.boolean().optional(),
  accent: z.enum(OfferAccents).optional(),
  active: z.boolean().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validTo: z.coerce.date().nullable().optional(),
};

export const createOfferSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code may contain letters, digits, - and _')
    .transform(code => code.toUpperCase()),
  ...offerBase,
});

export const updateOfferSchema = z.object(offerBase).partial();
