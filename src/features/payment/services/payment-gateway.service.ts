import { CURRENCY } from '../../../constants/config.constants';
import { buildUpiQrString, RazorpayClient } from '../../../utils/razorpay.util';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentOrderDto } from '../types/payment.types';

// Low-level payment operations shared by the booking and payment features.
export class PaymentGatewayService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly razorpay: RazorpayClient,
  ) {}

  isMock(): boolean {
    return this.razorpay.isMock();
  }

  async createOrder(
    booking: { id: string; totalPaise: number; customerPhone: string },
    method: string,
  ): Promise<PaymentOrderDto> {
    const order = await this.razorpay.createOrder(booking.totalPaise, booking.id, {
      bookingId: booking.id,
      phone: booking.customerPhone,
    });
    await this.paymentRepository.create({
      bookingId: booking.id,
      orderId: order.id,
      amountPaise: booking.totalPaise,
      method,
    });

    return {
      bookingId: booking.id,
      orderId: order.id,
      amount: booking.totalPaise,
      currency: CURRENCY,
      keyId: this.razorpay.keyId(),
      qrString:
        method === 'upi_qr'
          ? buildUpiQrString(booking.totalPaise, order.id, `Booking ${booking.id}`)
          : null,
      method,
      mock: this.razorpay.isMock(),
    };
  }

  async markBookingPaymentsFailed(bookingId: string): Promise<void> {
    await this.paymentRepository.markOpenFailedForBooking(bookingId);
  }

  // Refunds the booking's captured online payment. Returns false when it was not paid online.
  async refundBooking(bookingId: string, amountPaise: number): Promise<boolean> {
    const payment = await this.paymentRepository.findCapturedForBooking(bookingId);
    if (!payment || !payment.paymentId) return false;
    const refund = await this.razorpay.refund(
      payment.paymentId,
      Math.min(amountPaise, payment.amountPaise),
    );
    await this.paymentRepository.markRefunded(payment.id, refund.id);
    return true;
  }
}
