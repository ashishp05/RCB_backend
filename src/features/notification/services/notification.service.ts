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
