import { Prisma, PrismaClient } from '@prisma/client';

// Everything except secrets: never return password or reset-token hashes.
export const staffPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type StaffPublic = Prisma.StaffUserGetPayload<{ select: typeof staffPublicSelect }>;

export class StaffRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string) {
    return this.prisma.staffUser.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.staffUser.findUnique({ where: { id } });
  }

  async findPublicById(id: string) {
    return this.prisma.staffUser.findUnique({ where: { id }, select: staffPublicSelect });
  }

  async findAll() {
    return this.prisma.staffUser.findMany({
      select: staffPublicSelect,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async countActiveAdmins(excludeId?: string) {
    return this.prisma.staffUser.count({
      where: { role: 'admin', active: true, ...(excludeId && { id: { not: excludeId } }) },
    });
  }

  async create(data: { name: string; email: string; role: string; passwordHash: string }) {
    return this.prisma.staffUser.create({ data, select: staffPublicSelect });
  }

  async update(id: string, data: Prisma.StaffUserUpdateInput) {
    return this.prisma.staffUser.update({ where: { id }, data, select: staffPublicSelect });
  }

  async recordFailedLogin(id: string, attempts: number, lockedUntil: Date | null) {
    await this.prisma.staffUser.update({
      where: { id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  }

  async recordSuccessfulLogin(id: string) {
    await this.prisma.staffUser.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  }

  // New password: clears reset token and lockout, and revokes every existing session.
  async setPassword(id: string, passwordHash: string) {
    return this.prisma.staffUser.update({
      where: { id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
    });
  }

  async bumpTokenVersion(id: string) {
    return this.prisma.staffUser.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async setResetToken(id: string, tokenHash: string, expiresAt: Date) {
    await this.prisma.staffUser.update({
      where: { id },
      data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
    });
  }

  async findByValidResetToken(tokenHash: string, now: Date = new Date()) {
    return this.prisma.staffUser.findFirst({
      where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: now }, active: true },
    });
  }
}
