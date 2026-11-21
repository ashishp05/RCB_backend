import { z } from 'zod';

import { ADMIN_AUTH, StaffRoles } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { dateField, nameField } from '../../../utils/validators.util';

const email = z.string().trim().toLowerCase().email(ValidationMessages.invalid('email')).max(254);

// At least 8 characters with a letter and a digit.
const newPassword = z
  .string()
  .min(ADMIN_AUTH.PASSWORD_MIN_LENGTH, ValidationMessages.PASSWORD_RULES)
  .max(128)
  .refine(value => /[A-Za-z]/.test(value) && /\d/.test(value), ValidationMessages.PASSWORD_RULES);

const role = z.enum([StaffRoles.ADMIN, StaffRoles.STAFF]);

export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, ValidationMessages.required('Password')).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, ValidationMessages.required('Current password')),
  newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(128),
  newPassword,
});

export const createStaffSchema = z.object({
  name: nameField,
  email,
  role: role.default(StaffRoles.STAFF),
  password: newPassword,
  // Email the new account a welcome message with the admin panel link.
  sendInvite: z.boolean().default(false),
});

export const updateStaffSchema = z
  .object({ name: nameField.optional(), role: role.optional(), active: z.boolean().optional() })
  .refine(data => Object.keys(data).length > 0, 'Provide at least one field to update');

export const adminSetPasswordSchema = z.object({ newPassword });

export const dashboardQuerySchema = z.object({
  venueId: z.string().trim().min(1).optional(),
  date: dateField.optional(),
});
