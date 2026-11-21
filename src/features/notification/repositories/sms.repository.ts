import { Prisma, PrismaClient, SmsRecipient, SmsStatus } from '@prisma/client';

export class SmsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    toPhone: string;
    recipient: SmsRecipient;
    body: string;
    bookingId: string | null;
    provider: string;
    providerId: string | null;
    status: SmsStatus;
    error: string | null;
  }) {
    return this.prisma.smsMessage.create({ data });
  }

  async findMany(where: Prisma.SmsMessageWhereInput, take: number, skip: number) {
    const [total, records] = await this.prisma.$transaction([
      this.prisma.smsMessage.count({ where }),
      this.prisma.smsMessage.findMany({ where, orderBy: { sentAt: 'desc' }, take, skip }),
    ]);
    return { total, records };
  }
}
