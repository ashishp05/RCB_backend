import { z } from 'zod';

import {
  adminChangePasswordSchema,
  adminLoginSchema,
  adminRegisterSchema,
} from '../schemas/admin.schema';

export const AdminRoles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
} as const;

export type AdminRoleType = (typeof AdminRoles)[keyof typeof AdminRoles];

export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>;

export interface AdminProfileResponse {
  id: string;
  name: string;
  email: string;
  image: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAuthResponse {
  token: string;
  admin: AdminProfileResponse;
}
