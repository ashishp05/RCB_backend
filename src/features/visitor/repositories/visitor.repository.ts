import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export const visitorIdForPhone = (phone: string): string => `v-${phone}`;

export class VisitorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Soft identity: one row per phone; the latest name wins.
  async upsert(name: string, phone: string, db: Db = this.prisma) {
    const now = new Date();
    return db.visitor.upsert({
      where: { phone },
      update: { name, lastSeenAt: now },
      create: { id: visitorIdForPhone(phone), name, phone, createdAt: now, lastSeenAt: now },
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.visitor.findUnique({ where: { phone } });
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
}
