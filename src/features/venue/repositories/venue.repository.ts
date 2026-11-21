import { Prisma, PrismaClient } from '@prisma/client';

import { parseDateOnly } from '../../../utils/time.util';
import { venueWithDetails } from '../types/venue.types';

export class VenueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.venue.findMany({ ...venueWithDetails, orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    return this.prisma.venue.findUnique({ where: { id }, ...venueWithDetails });
  }

  // Slot rows for one pitch and day, with enough of the owner to judge whether they still count.
  async findSlotsForDay(pitchId: string, date: string) {
    return this.prisma.bookingSlot.findMany({
      where: { pitchId, date: parseDateOnly(date) },
      select: {
        hour: true,
        hold: { select: { expiresAt: true } },
        booking: { select: { status: true, expiresAt: true } },
      },
    });
  }

  async updateVenue(id: string, data: Prisma.VenueUpdateInput) {
    return this.prisma.venue.update({ where: { id }, data });
  }

  async upsertSettings(
    venueId: string,
    data: { hourlyRatePaise?: number; additionalChargePaise?: number; gstRateBps?: number },
  ) {
    return this.prisma.venueSettings.upsert({
      where: { venueId },
      update: data,
      create: { venueId, hourlyRatePaise: data.hourlyRatePaise ?? 0, ...data },
    });
  }

  async findActiveOffers(venueId: string, now: Date) {
    return this.prisma.offer.findMany({
      where: {
        venueId,
        active: true,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAllOffers(venueId: string) {
    return this.prisma.offer.findMany({ where: { venueId }, orderBy: { createdAt: 'desc' } });
  }

  async findOfferByCode(venueId: string, code: string) {
    return this.prisma.offer.findUnique({ where: { venueId_code: { venueId, code } } });
  }

  async findOfferById(id: string) {
    return this.prisma.offer.findUnique({ where: { id } });
  }

  async createOffer(data: Prisma.OfferUncheckedCreateInput) {
    return this.prisma.offer.create({ data });
  }

  async updateOffer(id: string, data: Prisma.OfferUncheckedUpdateInput) {
    return this.prisma.offer.update({ where: { id }, data });
  }
}
