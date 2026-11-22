import { PrismaClient } from '@prisma/client';

import { env } from '../config/env-config';
import { StaffRoles } from '../constants/config.constants';
import { hashPassword } from '../utils/password.util';

// Ensures the admin account from ADMIN_SEED_* exists. Runs on every server start and in `db:seed`.
// Create-only: if the account already exists its password, role and status are left untouched,
// so a password changed from the admin panel is never reset by a restart.
export const seedAdminAccount = async (
  prisma: PrismaClient,
): Promise<{ email: string; created: boolean }> => {
  const email = env.ADMIN_SEED_EMAIL.toLowerCase();
  const existing = await prisma.staffUser.findUnique({ where: { email } });
  if (existing) return { email, created: false };

  await prisma.staffUser.create({
    data: {
      name: env.ADMIN_SEED_NAME,
      email,
      role: StaffRoles.ADMIN,
      passwordHash: await hashPassword(env.ADMIN_SEED_PASSWORD),
    },
  });
  return { email, created: true };
};
