import { Booking, PaymentKind, Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

import { env } from '../../../config/env-config';
import { BOOKING_RULES, PaymentKindLabels } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { generateBookingId, generatePrefixedId } from '../../../utils/id.util';
import { toPaise, toRupees } from '../../../utils/money.util';
import {
  formatDateOnly,
  formatSlotRange,
  hoursUntil,
  minutesFromNow,
  parseDateOnly,
  slotStartInstant,
} from '../../../utils/time.util';
import { NotificationService } from '../../notification/services/notification.service';
import { PaymentGatewayService } from '../../payment/services/payment-gateway.service';
import { PaymentOrderDto } from '../../payment/types/payment.types';
import { VenueService } from '../../venue/services/venue.service';
import { VenueWithDetails } from '../../venue/types/venue.types';
import { VisitorRepository } from '../../visitor/repositories/visitor.repository';
import { BookingRepository, isSlotConflict } from '../repositories/booking.repository';
import {
  AdminBookingsQuery,
  AdminCreateBookingInput,
  BookingDto,
  BookingWithRelations,
  CreateBookingInput,
  CreateHoldInput,
  NewBookingData,
  OnlinePaymentKind,
  PriceSnapshot,
} from '../types/booking.types';
import { calculatePrice, toPriceDto } from './pricing.service';

const slotConflict = () => new ApiError(StatusCodes.CONFLICT, ValidationMessages.SLOT_UNAVAILABLE);

export const toBookingDto = (booking: BookingWithRelations): BookingDto => {
  const date = formatDateOnly(booking.date);
  return {
    id: booking.id,
    venueId: booking.venueId,
    venueName: booking.venue.name,
    pitchId: booking.pitchId,
    pitchName: booking.pitch.name,
    date,
    startHour: booking.startHour,
    endHour: booking.startHour + booking.hours,
    hours: booking.hours,
    slotLabel: formatSlotRange(booking.startHour, booking.hours),
    status: booking.status,
    channel: booking.channel,
    paymentKind: booking.paymentKind,
    paymentMethodLabel: booking.paymentMethodLabel,
    price: toPriceDto(booking.priceJson as unknown as PriceSnapshot),
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    staffId: booking.staffId,
    players: booking.players,
    notes: booking.notes,
    refundAmount: booking.refundAmountPaise === null ? null : toRupees(booking.refundAmountPaise),
    cancelReason: booking.cancelReason,
    expiresAt: booking.expiresAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    createdAt: booking.createdAt,
  };
};

const bookingStart = (booking: Booking): Date =>
  slotStartInstant(formatDateOnly(booking.date), booking.startHour);

export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly venueService: VenueService,
    private readonly visitorRepository: VisitorRepository,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly notificationService: NotificationService,
  ) {}

  // Holds

  async createHold(input: CreateHoldInput) {
    const venueId = input.venueId ?? env.DEFAULT_VENUE_ID;
    const selection = await this.venueService.validateSelection(
      venueId,
      input.pitchId,
      input.date,
      input.hours,
    );
    await this.bookingRepository.releaseExpired();

    try {
      const hold = await this.bookingRepository.createHold({
        id: generatePrefixedId('h'),
        venueId,
        pitchId: selection.pitchId,
        date: selection.date,
        hours: selection.hours,
        expiresAt: minutesFromNow(BOOKING_RULES.HOLD_TTL_MINUTES),
        visitorPhone: input.phone ?? null,
      });
      return {
        holdId: hold.id,
        expiresAt: hold.expiresAt,
        venueId,
        pitchId: hold.pitchId,
        date: selection.date,
        hours: hold.hours,
      };
    } catch (error) {
      if (isSlotConflict(error)) throw slotConflict();
      throw error;
    }
  }

  async releaseHold(holdId: string): Promise<void> {
    await this.bookingRepository.deleteHold(holdId);
  }

  async previewPrice(venueId: string, hours: number, offerCode?: string) {
    const venue = await this.venueService.getVenueEntity(venueId);
    return toPriceDto(await this.priceFor(venue, hours, offerCode));
  }

  // Public self-booking

  async createFromHold(input: CreateBookingInput): Promise<BookingDto> {
    const hold = await this.bookingRepository.findHold(input.holdId);
    if (!hold) throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.HOLD_NOT_FOUND);
    if (hold.expiresAt <= new Date()) {
      throw new ApiError(StatusCodes.GONE, ValidationMessages.HOLD_EXPIRED);
    }
    if (hold.visitorPhone && hold.visitorPhone !== input.customerPhone) {
      throw new ApiError(StatusCodes.FORBIDDEN, ValidationMessages.HOLD_PHONE_MISMATCH);
    }

    const venue = await this.venueService.getVenueEntity(hold.venueId);
    const price = await this.priceFor(venue, hold.hours.length, input.offerCode);
    const data = this.newBooking({
      venueId: hold.venueId,
      pitchId: hold.pitchId,
      date: formatDateOnly(hold.date),
      startHour: Math.min(...hold.hours),
      hours: hold.hours.length,
      status: 'pending',
      channel: input.channel,
      price,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      players: input.players,
      notes: input.notes,
    });

    const booking = await this.bookingRepository.createBookingFromHold(
      hold.id,
      hold.hours.length,
      data,
    );
    await this.visitorRepository.upsert(input.customerName, input.customerPhone);
    return this.getById(booking.id);
  }

  async getById(id: string): Promise<BookingDto> {
    return toBookingDto(await this.getEntity(id));
  }

  async listByPhone(phone: string): Promise<BookingDto[]> {
    const bookings = await this.bookingRepository.findByPhone(phone);
    return bookings.map(toBookingDto);
  }

  async cancelByCustomer(id: string, phone: string, reason?: string): Promise<BookingDto> {
    const booking = await this.getOwnedEntity(id, phone);
    return this.cancel(booking, reason ?? 'Cancelled by customer');
  }

  async rescheduleByCustomer(
    id: string,
    phone: string,
    date: string,
    startHour: number,
  ): Promise<BookingDto> {
    const booking = await this.getOwnedEntity(id, phone);
    if (hoursUntil(bookingStart(booking)) < BOOKING_RULES.RESCHEDULE_CUTOFF_HOURS) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.RESCHEDULE_TOO_LATE);
    }
    return this.reschedule(booking, date, startHour, booking.pitchId);
  }

  // Counter (staff) bookings

  async createAtCounter(
    staffId: string,
    input: AdminCreateBookingInput,
  ): Promise<{ booking: BookingDto; payment: PaymentOrderDto | null }> {
    const venueId = input.venueId ?? env.DEFAULT_VENUE_ID;
    const selection = await this.venueService.validateSelection(
      venueId,
      input.pitchId,
      input.date,
      input.hours,
    );
    const price = await this.priceFor(selection.venue, selection.hours.length, input.offerCode);
    const isCash = input.paymentKind === 'cash';

    const data = this.newBooking({
      venueId,
      pitchId: selection.pitchId,
      date: selection.date,
      startHour: selection.startHour,
      hours: selection.hours.length,
      status: isCash ? 'upcoming' : 'pending',
      channel: 'counter',
      price,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      players: input.players,
      notes: input.notes,
      staffId,
      paymentKind: input.paymentKind,
      paymentMethodLabel: input.paymentMethodLabel ?? PaymentKindLabels[input.paymentKind],
    });

    await this.bookingRepository.releaseExpired();
    try {
      await this.bookingRepository.createBookingWithSlots(data, selection.hours);
    } catch (error) {
      if (isSlotConflict(error)) throw slotConflict();
      throw error;
    }
    await this.visitorRepository.upsert(input.customerName, input.customerPhone);

    const booking = await this.getById(data.id);
    if (isCash) {
      await this.notificationService.sendBookingConfirmed(booking);
      return { booking, payment: null };
    }
    const payment = await this.paymentGateway.createOrder(
      { id: booking.id, totalPaise: price.totalPaise, customerPhone: booking.customerPhone },
      input.paymentKind,
    );
    return { booking, payment };
  }

  async listForAdmin(query: AdminBookingsQuery) {
    const where: Prisma.BookingWhereInput = {
      ...(query.venueId && { venueId: query.venueId }),
      ...(query.status && { status: query.status }),
      ...(query.channel && { channel: query.channel }),
      ...(query.paymentKind && { paymentKind: query.paymentKind }),
      ...(query.pitchId && { pitchId: query.pitchId }),
      ...(query.phone && { customerPhone: { contains: query.phone } }),
      ...((query.from || query.to) && {
        date: {
          ...(query.from && { gte: parseDateOnly(query.from) }),
          ...(query.to && { lte: parseDateOnly(query.to) }),
        },
      }),
      ...(query.search && {
        OR: [
          { id: { contains: query.search, mode: 'insensitive' } },
          { customerName: { contains: query.search, mode: 'insensitive' } },
          { customerPhone: { contains: query.search } },
        ],
      }),
    };
    const { total, records } = await this.bookingRepository.findMany(
      where,
      query.limit,
      query.skip,
    );
    return { total, records: records.map(toBookingDto) };
  }

  async getForAdmin(id: string) {
    const booking = await this.bookingRepository.findByIdWithHistory(id);
    if (!booking) throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.BOOKING_NOT_FOUND);
    return {
      ...toBookingDto(booking),
      staff: booking.staff,
      payments: booking.payments.map(payment => ({
        id: payment.id,
        provider: payment.provider,
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        status: payment.status,
        amount: toRupees(payment.amountPaise),
        method: payment.method,
        refundId: payment.refundId,
        createdAt: payment.createdAt,
      })),
      sms: booking.sms,
    };
  }

  async cancelByAdmin(id: string, reason?: string, refundAmount?: number): Promise<BookingDto> {
    const booking = await this.getEntity(id);
    const override = refundAmount === undefined ? undefined : toPaise(refundAmount);
    return this.cancel(booking, reason ?? 'Cancelled by staff', override);
  }

  async rescheduleByAdmin(
    id: string,
    date: string,
    startHour: number,
    pitchId?: string,
  ): Promise<BookingDto> {
    const booking = await this.getEntity(id);
    return this.reschedule(booking, date, startHour, pitchId ?? booking.pitchId);
  }

  // Staff confirms money received ("Cash received?") or simulates a UPI/card payment.
  async markPaid(id: string, kind?: PaymentKind, label?: string): Promise<BookingDto> {
    const booking = await this.getEntity(id);
    if (booking.status !== 'pending') {
      throw new ApiError(StatusCodes.CONFLICT, ValidationMessages.BOOKING_NOT_PENDING);
    }
    const paymentKind = kind ?? booking.paymentKind ?? 'cash';
    return this.confirm(id, {
      paymentKind,
      paymentMethodLabel: label ?? booking.paymentMethodLabel ?? PaymentKindLabels[paymentKind],
    });
  }

  // Payments

  async createPaymentOrder(bookingId: string, method: OnlinePaymentKind) {
    const booking = await this.getEntity(bookingId);
    if (booking.status !== 'pending') {
      throw new ApiError(StatusCodes.CONFLICT, ValidationMessages.BOOKING_NOT_PENDING);
    }
    // Give the visitor a full payment window from the moment checkout opens.
    await this.bookingRepository.update(bookingId, {
      paymentKind: method,
      paymentMethodLabel: PaymentKindLabels[method],
      expiresAt: minutesFromNow(BOOKING_RULES.PENDING_PAYMENT_TTL_MINUTES),
    });
    return this.paymentGateway.createOrder(booking, method);
  }

  // Idempotent pending -> upcoming. Sends confirmation SMS only on the first transition.
  async confirm(
    id: string,
    payment: { paymentKind?: PaymentKind; paymentMethodLabel?: string } = {},
  ): Promise<BookingDto> {
    const changed = await this.bookingRepository.confirmPending(id, payment);
    let booking = await this.getEntity(id);

    if (!changed && booking.status === 'cancelled') {
      // Paid after the pending window ran out: re-take the slots if nobody else has them.
      const hours = Array.from({ length: booking.hours }, (_, i) => booking.startHour + i);
      let reinstated = false;
      try {
        reinstated = await this.bookingRepository.reinstateCancelled(
          id,
          booking.pitchId,
          formatDateOnly(booking.date),
          hours,
        );
      } catch (error) {
        if (!isSlotConflict(error)) throw error;
      }
      if (!reinstated) {
        await this.paymentGateway.refundBooking(id, booking.totalPaise);
        await this.bookingRepository.update(id, {
          refundAmountPaise: booking.totalPaise,
        });
        throw slotConflict();
      }
      if (payment.paymentKind) {
        await this.bookingRepository.update(id, payment);
      }
      booking = await this.getEntity(id);
      await this.notificationService.sendBookingConfirmed(toBookingDto(booking));
      return toBookingDto(booking);
    }

    const dto = toBookingDto(booking);
    if (changed) await this.notificationService.sendBookingConfirmed(dto);
    return dto;
  }

  // Internals

  private async cancel(
    booking: BookingWithRelations,
    reason: string,
    refundOverridePaise?: number,
  ): Promise<BookingDto> {
    if (booking.status !== 'upcoming' && booking.status !== 'pending') {
      throw new ApiError(StatusCodes.CONFLICT, ValidationMessages.BOOKING_NOT_ACTIVE);
    }

    // Nothing was paid for a pending booking. Confirmed bookings get a full refund when
    // cancelled at least FREE_CANCELLATION_HOURS before start, otherwise none.
    const paidPaise = booking.status === 'upcoming' ? booking.totalPaise : 0;
    const policyRefund =
      hoursUntil(bookingStart(booking)) >= BOOKING_RULES.FREE_CANCELLATION_HOURS ? paidPaise : 0;
    const refundPaise = Math.min(refundOverridePaise ?? policyRefund, paidPaise);

    if (refundPaise > 0) {
      // Online payments are refunded through Razorpay; cash is handed back at the counter.
      await this.paymentGateway.refundBooking(booking.id, refundPaise);
    }
    const done = await this.bookingRepository.cancel(booking.id, {
      cancelReason: reason,
      refundAmountPaise: booking.status === 'upcoming' ? refundPaise : null,
    });
    if (!done) throw new ApiError(StatusCodes.CONFLICT, ValidationMessages.BOOKING_NOT_ACTIVE);
    return this.getById(booking.id);
  }

  private async reschedule(
    booking: BookingWithRelations,
    date: string,
    startHour: number,
    pitchId: string,
  ): Promise<BookingDto> {
    if (booking.status !== 'upcoming' && booking.status !== 'pending') {
      throw new ApiError(StatusCodes.CONFLICT, ValidationMessages.BOOKING_NOT_ACTIVE);
    }
    if (
      formatDateOnly(booking.date) === date &&
      booking.startHour === startHour &&
      booking.pitchId === pitchId
    ) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.RESCHEDULE_SAME_SLOT);
    }

    const hours = Array.from({ length: booking.hours }, (_, i) => startHour + i);
    if (hours[hours.length - 1] > 23) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.OUTSIDE_OPENING_HOURS);
    }
    const selection = await this.venueService.validateSelection(
      booking.venueId,
      pitchId,
      date,
      hours,
    );
    await this.bookingRepository.releaseExpired();

    try {
      const updated = await this.bookingRepository.reschedule(booking.id, {
        pitchId: selection.pitchId,
        date: selection.date,
        startHour: selection.startHour,
        hours: booking.hours,
      });
      return toBookingDto(updated);
    } catch (error) {
      if (isSlotConflict(error)) throw slotConflict();
      throw error;
    }
  }

  private async priceFor(
    venue: VenueWithDetails,
    hours: number,
    offerCode?: string,
  ): Promise<PriceSnapshot> {
    const settings = venue.settings;
    if (!settings) throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.VENUE_NOT_FOUND);
    const subtotalPaise = settings.hourlyRatePaise * hours;
    const offer = offerCode
      ? await this.venueService.resolveOffer(venue.id, offerCode, subtotalPaise)
      : null;
    return calculatePrice({
      hourlyRatePaise: settings.hourlyRatePaise,
      hours,
      additionalChargePaise: settings.additionalChargePaise,
      gstRateBps: settings.gstRateBps,
      offer,
    });
  }

  private newBooking(
    input: Pick<
      NewBookingData,
      | 'venueId'
      | 'pitchId'
      | 'date'
      | 'startHour'
      | 'hours'
      | 'status'
      | 'channel'
      | 'price'
      | 'customerName'
      | 'customerPhone'
    > & {
      players?: number;
      notes?: string;
      staffId?: string;
      paymentKind?: PaymentKind;
      paymentMethodLabel?: string;
    },
  ): NewBookingData {
    const isConfirmed = input.status === 'upcoming';
    return {
      ...input,
      id: generateBookingId(),
      staffId: input.staffId ?? null,
      players: input.players ?? null,
      notes: input.notes || null,
      paymentKind: input.paymentKind ?? null,
      paymentMethodLabel: input.paymentMethodLabel ?? null,
      expiresAt: isConfirmed ? null : minutesFromNow(BOOKING_RULES.PENDING_PAYMENT_TTL_MINUTES),
      confirmedAt: isConfirmed ? new Date() : null,
    };
  }

  private async getEntity(id: string): Promise<BookingWithRelations> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.BOOKING_NOT_FOUND);
    return booking;
  }

  private async getOwnedEntity(id: string, phone: string): Promise<BookingWithRelations> {
    const booking = await this.getEntity(id);
    if (booking.customerPhone !== phone) {
      throw new ApiError(StatusCodes.FORBIDDEN, ValidationMessages.BOOKING_PHONE_MISMATCH);
    }
    return booking;
  }
}
