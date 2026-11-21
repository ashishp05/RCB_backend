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

const CAPTURE_EVENTS = new Set(['payment.captured', 'order.paid']);

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly bookingService: BookingService,
    private readonly razorpay: RazorpayClient,
  ) {}

  async createOrder(input: CreateOrderInput): Promise<PaymentOrderDto> {
    return this.bookingService.createPaymentOrder(input.bookingId, input.method);
  }

  async verify(input: VerifyPaymentInput): Promise<BookingDto> {
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

    return this.capture(payment.orderId, input.razorpayPaymentId, payment.bookingId);
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
      await this.capture(payment.orderId, entity.id, payment.bookingId).catch(error =>
        console.error(`Webhook capture failed for ${payment.bookingId}`, error),
      );
    } else if (event.event === 'payment.failed') {
      // The visitor may retry inside Checkout; the pending booking expires on its own.
      await this.paymentRepository.markFailed(payment.orderId, entity.id);
    }
  }

  // The payment kind was set when the order was created, so only the status changes here.
  private async capture(
    orderId: string,
    paymentId: string,
    bookingId: string,
  ): Promise<BookingDto> {
    await this.paymentRepository.markCaptured(orderId, paymentId);
    return this.bookingService.confirm(bookingId);
  }
}
