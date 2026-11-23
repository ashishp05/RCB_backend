import { z } from 'zod';

import { CUSTOMER_AUTH } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { isValidDateString, todayInVenue } from '../../../utils/time.util';
import { nameField, phoneField } from '../../../utils/validators.util';

// Simple login (CUSTOMER_LOGIN_MODE=simple): name + mobile, no SMS code.
export const simpleLoginSchema = z.object({ phone: phoneField, name: nameField });

export const sendOtpSchema = z.object({ phone: phoneField });

export const verifyOtpSchema = z.object({
  phone: phoneField,
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${CUSTOMER_AUTH.OTP_LENGTH}}$`), ValidationMessages.ENTER_VALID_OTP),
  // First sign-in: the name to save. Later sign-ins keep the stored name when omitted.
  name: nameField.optional(),
});

const birthdayField = z
  .string()
  .trim()
  .refine(
    value => isValidDateString(value) && value < todayInVenue(),
    ValidationMessages.ENTER_VALID_BIRTHDAY,
  );

// Send null to clear email or birthday.
export const updateProfileSchema = z
  .object({
    name: nameField,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(ValidationMessages.ENTER_VALID_EMAIL)
      .max(120)
      .nullable(),
    birthday: birthdayField.nullable(),
  })
  .partial();

export const customersQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
