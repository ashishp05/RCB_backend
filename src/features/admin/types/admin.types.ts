import { z } from 'zod';

import {
  adminLoginSchema,
  adminSetPasswordSchema,
  changePasswordSchema,
  createStaffSchema,
  dashboardQuerySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateStaffSchema,
} from '../schemas/admin.schema';

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type AdminSetPasswordInput = z.infer<typeof adminSetPasswordSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export interface StaffDto {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSessionResponse {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number | null;
  staffId: string;
  staff: StaffDto;
}
