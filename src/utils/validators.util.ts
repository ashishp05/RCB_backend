import { z } from 'zod';

import { ValidationMessages } from '../constants/messages';
import { isValidIndianMobile, normalizeIndianMobile } from './phone.util';
import { isValidDateString } from './time.util';

// Shared Zod building blocks for box cricket request schemas.
export const phoneField = z
  .string()
  .trim()
  .refine(isValidIndianMobile, ValidationMessages.ENTER_VALID_MOBILE)
  .transform(normalizeIndianMobile);

export const nameField = z
  .string()
  .trim()
  .min(2, ValidationMessages.ENTER_VALID_NAME)
  .max(80, ValidationMessages.max('Name', 80));

export const dateField = z
  .string()
  .trim()
  .refine(isValidDateString, ValidationMessages.INVALID_DATE);

export const hourField = z.coerce
  .number()
  .int(ValidationMessages.INVALID_HOUR)
  .min(0, ValidationMessages.INVALID_HOUR)
  .max(23, ValidationMessages.INVALID_HOUR);

// A non-empty list of consecutive hours, returned sorted.
export const hoursField = z
  .array(hourField)
  .min(1, ValidationMessages.required('hours'))
  .max(24)
  .transform(hours => [...new Set(hours)].sort((a, b) => a - b))
  .refine(
    hours => hours.every((hour, index) => index === 0 || hour === hours[index - 1] + 1),
    ValidationMessages.HOURS_NOT_CONSECUTIVE,
  );

export const offerCodeField = z
  .string()
  .trim()
  .max(32)
  .transform(code => code.toUpperCase())
  .optional()
  .or(z.literal('').transform(() => undefined));

// Contract values are snake_case (upi_qr); the Flutter enum names (upiQr) are accepted too.
const PAYMENT_KIND_ALIASES: Record<string, string> = {
  upiQr: 'upi_qr',
  creditCard: 'credit_card',
  debitCard: 'debit_card',
};

const withPaymentAliases = (value: unknown) =>
  typeof value === 'string' ? (PAYMENT_KIND_ALIASES[value] ?? value) : value;

export const paymentKindField = z.preprocess(
  withPaymentAliases,
  z.enum(['upi_qr', 'credit_card', 'debit_card', 'cash']),
);

export const onlinePaymentKindField = z.preprocess(
  withPaymentAliases,
  z.enum(['upi_qr', 'credit_card', 'debit_card']),
);
