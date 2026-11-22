import { SmsRecipient } from '@prisma/client';

import { env } from '../../../config/env-config';
import { formatRupees } from '../../../utils/money.util';
import { SmsProvider } from '../../../utils/sms.util';
import { formatDisplayDate } from '../../../utils/time.util';
import { BookingDto } from '../../booking/types/booking.types';
import { SmsRepository } from '../repositories/sms.repository';
import { SmsQuery } from '../types/sms.types';

export class NotificationService {
  constructor(
    private readonly smsRepository: SmsRepository,
    private readonly provider: SmsProvider,
  ) {}

  // Sends the customer + admin confirmation SMS. Never throws: a failed SMS must not undo a
  // confirmed booking. Every attempt is stored in sms_messages.
  async sendBookingConfirmed(booking: BookingDto): Promise<void> {
    const date = formatDisplayDate(booking.date);
    const amount = formatRupees(Math.round(booking.price.total * 100));
    const variables = {
      booking_id: booking.id,
      date,
      slot: booking.slotLabel,
      amount,
      name: booking.customerName,
      phone: booking.customerPhone,
      venue: booking.venueName,
    };

    const customerBody =
      `Booking confirmed at ${booking.venueName}. ID ${booking.id}, ${date}, ` +
      `${booking.slotLabel} (${booking.pitchName}). Amount ${amount}.`;
    const adminBody =
      `New booking ${booking.id}: ${booking.customerName} (${booking.customerPhone}), ${date}, ` +
      `${booking.slotLabel}, ${booking.pitchName}. ${amount} via ` +
      `${booking.paymentMethodLabel ?? booking.paymentKind ?? 'n/a'} (${booking.channel}).`;

    await this.send('customer', booking.customerPhone, customerBody, booking.id, {
      templateId: env.MSG91_TEMPLATE_CUSTOMER,
      variables,
    });

    if (env.ADMIN_NOTIFY_PHONE) {
      await this.send('admin', env.ADMIN_NOTIFY_PHONE, adminBody, booking.id, {
        templateId: env.MSG91_TEMPLATE_ADMIN,
        variables,
      });
    } else {
      console.warn('ADMIN_NOTIFY_PHONE is not set; skipping admin SMS.');
    }
  }

  // Confirmed booking cancelled (by the customer or staff): refund details for the customer and a
  // heads-up for the venue. Never throws.
  async sendBookingCancelled(booking: BookingDto): Promise<void> {
    const date = formatDisplayDate(booking.date);
    const refund = booking.refundAmount
      ? formatRupees(Math.round(booking.refundAmount * 100))
      : null;
    const variables = {
      booking_id: booking.id,
      date,
      slot: booking.slotLabel,
      refund: refund ?? 'Rs 0',
      name: booking.customerName,
      phone: booking.customerPhone,
      venue: booking.venueName,
    };
    const customerBody =
      `Your booking ${booking.id} at ${booking.venueName} (${date}, ${booking.slotLabel}) is cancelled. ` +
      (refund
        ? `${refund} will be refunded to your original payment method in 3-5 working days.`
        : 'No refund applies to this cancellation.');
    const adminBody =
      `Cancelled ${booking.id}: ${booking.customerName} (${booking.customerPhone}), ${date}, ` +
      `${booking.slotLabel}. Refund ${refund ?? 'Rs 0'}. Slot is free again.`;
    await this.notify(
      booking.id,
      customerBody,
      adminBody,
      booking.customerPhone,
      env.MSG91_TEMPLATE_CANCELLED,
      variables,
    );
  }

  async sendBookingRescheduled(booking: BookingDto, previousSlot: string): Promise<void> {
    const date = formatDisplayDate(booking.date);
    const variables = {
      booking_id: booking.id,
      date,
      slot: booking.slotLabel,
      previous: previousSlot,
      name: booking.customerName,
      phone: booking.customerPhone,
      venue: booking.venueName,
    };
    const customerBody =
      `Your booking ${booking.id} at ${booking.venueName} is moved to ${date}, ` +
      `${booking.slotLabel} (${booking.pitchName}). Your QR stays the same.`;
    const adminBody =
      `Rescheduled ${booking.id}: ${booking.customerName} (${booking.customerPhone}) from ` +
      `${previousSlot} to ${date}, ${booking.slotLabel}, ${booking.pitchName}.`;
    await this.notify(
      booking.id,
      customerBody,
      adminBody,
      booking.customerPhone,
      env.MSG91_TEMPLATE_RESCHEDULED,
      variables,
    );
  }

  async list(query: SmsQuery) {
    return this.smsRepository.findMany(
      {
        ...(query.bookingId && { bookingId: query.bookingId }),
        ...(query.recipient && { recipient: query.recipient }),
        ...(query.status && { status: query.status }),
      },
      query.limit,
      query.skip,
    );
  }

  // Customer message + venue admin message (when ADMIN_NOTIFY_PHONE is set). MSG91 uses one DLT
  // template per event for both recipients; other providers send the plain text.
  private async notify(
    bookingId: string,
    customerBody: string,
    adminBody: string,
    customerPhone: string,
    templateId: string | undefined,
    variables: Record<string, string>,
  ): Promise<void> {
    await this.send('customer', customerPhone, customerBody, bookingId, { templateId, variables });
    if (env.ADMIN_NOTIFY_PHONE) {
      await this.send('admin', env.ADMIN_NOTIFY_PHONE, adminBody, bookingId, {
        templateId,
        variables,
      });
    }
  }

  private async send(
    recipient: SmsRecipient,
    to: string,
    body: string,
    bookingId: string,
    template: { templateId?: string; variables: Record<string, string> },
  ): Promise<void> {
    try {
      const result = await this.provider.send({ to, body, ...template });
      await this.smsRepository.create({
        toPhone: to,
        recipient,
        body,
        bookingId,
        provider: result.provider,
        providerId: result.providerId ?? null,
        status: result.status,
        error: result.error ?? null,
      });
      if (result.status === 'failed') {
        console.error(`SMS to ${recipient} failed for ${bookingId}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Could not record SMS for ${bookingId}`, error);
    }
  }
}
