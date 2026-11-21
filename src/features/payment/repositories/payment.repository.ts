import { PrismaClient } from '@prisma/client';

export class PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: { bookingId: string; orderId: string; amountPaise: number; method: string }) {
    return this.prisma.payment.create({ data: { ...data, provider: 'razorpay' } });
  }

  async findByOrderId(orderId: string) {
    return this.prisma.payment.findUnique({ where: { orderId } });
  }

  // Conditional update keeps verify + webhook idempotent when both arrive.
  async markCaptured(orderId: string, paymentId: string): Promise<boolean> {
    const result = await this.prisma.payment.updateMany({
      where: { orderId, status: { in: ['created', 'failed'] } },
      data: { status: 'captured', paymentId },
    });
    return result.count === 1;
  }

  async markFailed(orderId: string, paymentId?: string) {
    await this.prisma.payment.updateMany({
      where: { orderId, status: 'created' },
      data: { status: 'failed', ...(paymentId && { paymentId }) },
    });
  }

  async markOpenFailedForBooking(bookingId: string) {
    await this.prisma.payment.updateMany({
      where: { bookingId, status: 'created' },
      data: { status: 'failed' },
    });
  }

  async findCapturedForBooking(bookingId: string) {
    return this.prisma.payment.findFirst({
      where: { bookingId, status: 'captured' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRefunded(id: string, refundId: string) {
    return this.prisma.payment.update({ where: { id }, data: { status: 'refunded', refundId } });
  }
}
