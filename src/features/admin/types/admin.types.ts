import { z } from 'zod';

import { dashboardQuerySchema, staffLoginSchema } from '../schemas/admin.schema';

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export interface StaffLoginResponse {
  token: string;
  staffId: string;
  name: string;
  role: string;
}
