import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export const visitorIdForPhone = (phone: string): string => `v-${phone}`;

export class VisitorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // One row per phone. A name given at booking or login replaces the stored one.
  async upsert(name: string, phone: string, db: Db = this.prisma) {
    const now = new Date();
    return db.visitor.upsert({
      where: { phone },
      update: { name, lastSeenAt: now },
      create: { id: visitorIdForPhone(phone), name, phone, createdAt: now, lastSeenAt: now },
    });
  }

  // Login: creates the visitor on first sign-in; keeps the stored name unless a new one is given.
  async touch(phone: string, name: string | undefined) {
    const now = new Date();
    return this.prisma.visitor.upsert({
      where: { phone },
      update: { lastSeenAt: now, ...(name && { name }) },
      create: {
        id: visitorIdForPhone(phone),
        name: name ?? '',
        phone,
        createdAt: now,
        lastSeenAt: now,
      },
    });
  }

  async updateProfile(phone: string, data: Prisma.VisitorUpdateInput) {
    return this.prisma.visitor.update({ where: { phone }, data });
  }

  async findByPhone(phone: string) {
    return this.prisma.visitor.findUnique({ where: { phone } });
  }

  async findById(id: string) {
    return this.prisma.visitor.findUnique({ where: { id } });
  }

  async findMany(search: string | undefined, limit: number, skip: number) {
    const where: Prisma.VisitorWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }
      : {};
    const [total, records] = await this.prisma.$transaction([
      this.prisma.visitor.count({ where }),
      this.prisma.visitor.findMany({ where, orderBy: { lastSeenAt: 'desc' }, take: limit, skip }),
    ]);
    return { total, records };
  }

  // Booking count, spend (confirmed bookings) and last booking per phone.
  async bookingStatsForPhones(phones: string[]) {
    if (phones.length === 0) return [];
    return this.prisma.booking.groupBy({
      by: ['customerPhone'],
      where: { customerPhone: { in: phones }, status: { in: ['upcoming', 'completed'] } },
      _count: { _all: true },
      _sum: { totalPaise: true },
      _max: { createdAt: true },
    });
  }

  // OTP codes

  async createOtp(phone: string, codeHash: string, expiresAt: Date) {
    // A new code replaces any unused earlier one for this number.
    await this.prisma.otpCode.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return this.prisma.otpCode.create({ data: { phone, codeHash, expiresAt } });
  }

  async latestOtp(phone: string) {
    return this.prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } });
  }

  async latestActiveOtp(phone: string) {
    return this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countOtpsSince(phone: string, since: Date) {
    return this.prisma.otpCode.count({ where: { phone, createdAt: { gte: since } } });
  }

  async recordOtpAttempt(id: string, burn: boolean) {
    return this.prisma.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 }, ...(burn && { consumedAt: new Date() }) },
    });
  }

  // Marks the code used. Returns false if another request already used it (double submit).
  async consumeOtp(id: string): Promise<boolean> {
    const { count } = await this.prisma.otpCode.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return count === 1;
  }

  // Old codes are only needed for the hourly send limit.
  async deleteOtpsBefore(before: Date) {
    return this.prisma.otpCode.deleteMany({ where: { createdAt: { lt: before } } });
  }
}
