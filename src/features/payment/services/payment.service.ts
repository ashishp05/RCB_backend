import { StatusCodes } from 'http-status-codes';

import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { RazorpayClient } from '../../../utils/razorpay.util';
import { BookingService } from '../../booking/services/booking.service';
import { BookingDto } from '../../booking/types/booking.types';
import { PaymentRepository } from '../repositories/payment.repository';
import {
  CreateOrderInput,
  PaymentOrderDto,
  RazorpayWebhookEvent,
  VerifyPaymentInput,
} from '../types/payment.types';

const CAPTURE_EVENTS = new Set(['payment.authorized', 'payment.captured', 'order.paid']);

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly bookingService: BookingService,
    private readonly razorpay: RazorpayClient,
  ) {}

  // Customer checkout: the signed-in visitor must own the booking.
  async createOrder(input: CreateOrderInput, phone: string): Promise<PaymentOrderDto> {
    await this.bookingService.getOwned(input.bookingId, phone);
    return this.bookingService.createPaymentOrder(input.bookingId, input.method);
  }

  async verify(input: VerifyPaymentInput, phone: string): Promise<BookingDto> {
    await this.bookingService.getOwned(input.bookingId, phone);
    return this.verifyCheckout(input);
  }

  // Counter desk: Razorpay Checkout opened on the staff screen (UPI QR / card).
  async verifyForStaff(input: VerifyPaymentInput): Promise<BookingDto> {
    await this.bookingService.getById(input.bookingId);
    return this.verifyCheckout(input);
  }

  private async verifyCheckout(input: VerifyPaymentInput): Promise<BookingDto> {
    const payment = await this.paymentRepository.findByOrderId(input.razorpayOrderId);
    if (!payment || payment.bookingId !== input.bookingId) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.PAYMENT_NOT_FOUND);
    }
    const valid = this.razorpay.verifyPaymentSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
    );
    if (!valid) {
      await this.paymentRepository.markFailed(input.razorpayOrderId, input.razorpayPaymentId);
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.PAYMENT_SIGNATURE_INVALID);
    }

    return this.capture(
      payment.orderId,
      input.razorpayPaymentId,
      payment.bookingId,
      payment.amountPaise,
    );
  }

  // Webhooks are verified on the raw body and processed idempotently (same path as verify).
  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.WEBHOOK_SIGNATURE_INVALID);
    }
    const event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookEvent;
    const entity = event.payload?.payment?.entity;
    if (!entity?.order_id) return;

    const payment = await this.paymentRepository.findByOrderId(entity.order_id);
    if (!payment) return;

    if (CAPTURE_EVENTS.has(event.event)) {
      await this.capture(payment.orderId, entity.id, payment.bookingId, payment.amountPaise).catch(
        error => console.error(`Webhook capture failed for ${payment.bookingId}`, error),
      );
    } else if (event.event === 'payment.failed') {
      // The visitor may retry inside Checkout; the pending booking expires on its own.
      await this.paymentRepository.markFailed(payment.orderId, entity.id);
    }
  }

  // Confirms with Razorpay that the payment belongs to this order for the full amount, captures
  // it if the account uses manual capture, then confirms the booking. The payment kind was set
  // when the order was created, so only the status changes here.
  private async capture(
    orderId: string,
    paymentId: string,
    bookingId: string,
    amountPaise: number,
  ): Promise<BookingDto> {
    if (!this.razorpay.isMock() && !paymentId.startsWith('pay_mock')) {
      let remote = await this.razorpay.fetchPayment(paymentId);
      if (remote.order_id !== orderId || remote.amount !== amountPaise) {
        await this.paymentRepository.markFailed(orderId, paymentId);
        throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.PAYMENT_SIGNATURE_INVALID);
      }
      if (remote.status === 'authorized') {
        remote = await this.razorpay.capturePayment(paymentId, amountPaise);
      }
      if (remote.status !== 'captured') {
        await this.paymentRepository.markFailed(orderId, paymentId);
        throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.PAYMENT_NOT_COMPLETED);
      }
    }
    await this.paymentRepository.markCaptured(orderId, paymentId);
    return this.bookingService.confirm(bookingId);
  }
}
