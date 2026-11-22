import { BookingStatus, Prisma, PrismaClient } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

import { VENUE_TIME_ZONE } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { parseDateOnly } from '../../../utils/time.util';
import { bookingInclude, NewBookingData } from '../types/booking.types';

const ACTIVE_STATUSES: BookingStatus[] = ['upcoming', 'pending'];

// A unique violation on booking_slots means somebody else owns one of the hours.
export const isSlotConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const slotRows = (pitchId: string, date: string, hours: number[]) =>
  hours.map(hour => ({ pitchId, date: parseDateOnly(date), hour }));

const hoursFrom = (startHour: number, count: number): number[] =>
  Array.from({ length: count }, (_, index) => startHour + index);

const toBookingCreate = (data: NewBookingData): Prisma.BookingUncheckedCreateInput => ({
  id: data.id,
  venueId: data.venueId,
  pitchId: data.pitchId,
  date: parseDateOnly(data.date),
  startHour: data.startHour,
  hours: data.hours,
  status: data.status,
  channel: data.channel,
  paymentKind: data.paymentKind,
  paymentMethodLabel: data.paymentMethodLabel,
  priceJson: data.price as unknown as Prisma.InputJsonValue,
  totalPaise: data.price.totalPaise,
  couponCode: data.price.couponCode,
  customerName: data.customerName,
  customerPhone: data.customerPhone,
  staffId: data.staffId,
  players: data.players,
  notes: data.notes,
  expiresAt: data.expiresAt,
  confirmedAt: data.confirmedAt,
});

export class BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Holds

  async createHold(data: {
    id: string;
    venueId: string;
    pitchId: string;
    date: string;
    hours: number[];
    expiresAt: Date;
    visitorPhone: string | null;
  }) {
    return this.prisma.$transaction(async tx => {
      // One live hold per visitor: picking new slots releases the previous selection.
      if (data.visitorPhone) {
        await tx.hold.deleteMany({ where: { visitorPhone: data.visitorPhone } });
      }
      const hold = await tx.hold.create({
        data: { ...data, date: parseDateOnly(data.date) },
      });
      await tx.bookingSlot.createMany({
        data: slotRows(data.pitchId, data.date, data.hours).map(row => ({
          ...row,
          holdId: hold.id,
        })),
      });
      return hold;
    });
  }

  async findHold(id: string) {
    return this.prisma.hold.findUnique({ where: { id } });
  }

  // Only the visitor who made the hold can release it.
  async deleteHold(id: string, visitorPhone: string) {
    await this.prisma.hold.deleteMany({ where: { id, visitorPhone } });
  }

  // Moves the hold's slot rows onto a new booking in one transaction.
  async createBookingFromHold(holdId: string, holdHours: number, data: NewBookingData) {
    return this.prisma.$transaction(async tx => {
      const booking = await tx.booking.create({ data: toBookingCreate(data) });
      const moved = await tx.bookingSlot.updateMany({
        where: { holdId },
        data: { holdId: null, bookingId: booking.id },
      });
      if (moved.count !== holdHours) {
        // The hold expired and was swept between the read and this transaction.
        throw new ApiError(StatusCodes.GONE, ValidationMessages.HOLD_EXPIRED);
      }
      await tx.hold.delete({ where: { id: holdId } });
      return booking;
    });
  }

  // Counter bookings lock slots directly (no hold step).
  async createBookingWithSlots(data: NewBookingData, hours: number[]) {
    return this.prisma.$transaction(async tx => {
      const booking = await tx.booking.create({ data: toBookingCreate(data) });
      await tx.bookingSlot.createMany({
        data: slotRows(data.pitchId, data.date, hours).map(row => ({
          ...row,
          bookingId: booking.id,
        })),
      });
      return booking;
    });
  }

  // Bookings

  async findById(id: string) {
    return this.prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  }

  async findByIdWithHistory(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        ...bookingInclude,
        payments: { orderBy: { createdAt: 'desc' } },
        sms: { orderBy: { sentAt: 'desc' } },
        staff: { select: { id: true, name: true } },
      },
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.booking.findMany({
      where: { customerPhone: phone },
      include: bookingInclude,
      orderBy: [{ date: 'desc' }, { startHour: 'desc' }],
    });
  }

  async findMany(
    where: Prisma.BookingWhereInput,
    take: number,
    skip: number,
    direction: Prisma.SortOrder = 'desc',
  ) {
    const [total, records] = await this.prisma.$transaction([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: [{ date: direction }, { startHour: direction }, { createdAt: 'desc' }],
        take,
        skip,
      }),
    ]);
    return { total, records };
  }

  async update(id: string, data: Prisma.BookingUncheckedUpdateInput) {
    return this.prisma.booking.update({ where: { id }, data });
  }

  // Pending -> upcoming. Returns false when the booking was not pending (already confirmed,
  // or released), so callers can stay idempotent.
  async confirmPending(
    id: string,
    data: { paymentKind?: Prisma.BookingUpdateInput['paymentKind']; paymentMethodLabel?: string },
  ): Promise<boolean> {
    const result = await this.prisma.booking.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'upcoming', confirmedAt: new Date(), expiresAt: null, ...data },
    });
    return result.count === 1;
  }

  // A payment captured after the pending booking was released: take the slots back if free.
  async reinstateCancelled(id: string, pitchId: string, date: string, hours: number[]) {
    return this.prisma.$transaction(async tx => {
      const updated = await tx.booking.updateMany({
        where: { id, status: 'cancelled' },
        data: {
          status: 'upcoming',
          confirmedAt: new Date(),
          cancelledAt: null,
          cancelReason: null,
          expiresAt: null,
        },
      });
      if (updated.count !== 1) return false;
      await tx.bookingSlot.createMany({
        data: slotRows(pitchId, date, hours).map(row => ({ ...row, bookingId: id })),
      });
      return true;
    });
  }

  async cancel(
    id: string,
    data: { cancelReason: string | null; refundAmountPaise: number | null },
  ): Promise<boolean> {
    return this.prisma.$transaction(async tx => {
      const updated = await tx.booking.updateMany({
        where: { id, status: { in: ACTIVE_STATUSES } },
        data: { status: 'cancelled', cancelledAt: new Date(), expiresAt: null, ...data },
      });
      if (updated.count !== 1) return false;
      await tx.bookingSlot.deleteMany({ where: { bookingId: id } });
      return true;
    });
  }

  // Swaps the booking's slot rows; a conflict rolls back and keeps the original slots.
  async reschedule(
    id: string,
    target: { pitchId: string; date: string; startHour: number; hours: number },
  ) {
    return this.prisma.$transaction(async tx => {
      await tx.bookingSlot.deleteMany({ where: { bookingId: id } });
      await tx.bookingSlot.createMany({
        data: slotRows(target.pitchId, target.date, hoursFrom(target.startHour, target.hours)).map(
          row => ({ ...row, bookingId: id }),
        ),
      });
      return tx.booking.update({
        where: { id },
        data: {
          pitchId: target.pitchId,
          date: parseDateOnly(target.date),
          startHour: target.startHour,
        },
        include: bookingInclude,
      });
    });
  }

  async findTodayForVenue(venueId: string, date: string) {
    return this.prisma.booking.findMany({
      where: { venueId, date: parseDateOnly(date), status: { not: 'cancelled' } },
      include: bookingInclude,
      orderBy: { startHour: 'asc' },
    });
  }

  // Maintenance

  // Frees expired holds and unpaid pending bookings so their slots can be booked again.
  async releaseExpired(now: Date = new Date()) {
    const holds = await this.prisma.hold.deleteMany({ where: { expiresAt: { lt: now } } });

    const expired = await this.prisma.booking.findMany({
      where: { status: 'pending', expiresAt: { lt: now } },
      select: { id: true },
    });
    let released = 0;
    for (const { id } of expired) {
      const done = await this.cancel(id, {
        cancelReason: 'Payment not completed in time',
        refundAmountPaise: null,
      });
      if (done) released++;
    }
    return { holds: holds.count, pendingReleased: released };
  }

  // Upcoming bookings whose last hour has ended become completed.
  async completeFinished(): Promise<number> {
    const completed = await this.prisma.$executeRaw`
      UPDATE "bookings"
      SET "status" = 'completed', "updatedAt" = now()
      WHERE "status" = 'upcoming'
        AND (("date" + make_interval(hours => "startHour" + "hours")) AT TIME ZONE ${VENUE_TIME_ZONE}) < now()
    `;
    await this.prisma.bookingSlot.deleteMany({
      where: { booking: { status: { in: ['completed', 'cancelled'] } } },
    });
    return completed;
  }

  async statsForDate(venueId: string, date: string) {
    const day = parseDateOnly(date);
    const [byStatus, byChannel, pendingTotal, upcomingTotal] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { venueId, date: day },
        _count: { _all: true },
        _sum: { totalPaise: true, hours: true },
      }),
      this.prisma.booking.groupBy({
        by: ['channel'],
        where: { venueId, date: day, status: { in: ['upcoming', 'completed'] } },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
      this.prisma.booking.count({ where: { venueId, status: 'pending' } }),
      this.prisma.booking.count({ where: { venueId, status: 'upcoming' } }),
    ]);
    return { byStatus, byChannel, pendingTotal, upcomingTotal };
  }
}
