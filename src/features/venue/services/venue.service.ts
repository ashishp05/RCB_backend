import { Offer } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

import { WEEKEND_DAYS } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { bpsToPercent, percentToBps, toPaise, toRupees } from '../../../utils/money.util';
import {
  addDaysToDate,
  formatHour,
  parseDateOnly,
  slotStartInstant,
  todayInVenue,
} from '../../../utils/time.util';
import { calculatePrice } from '../../booking/services/pricing.service';
import { VenueRepository } from '../repositories/venue.repository';
import {
  CreateOfferInput,
  OfferDto,
  SettingsDto,
  SlotDto,
  SlotStatus,
  UpdateOfferInput,
  UpdateSettingsInput,
  ValidatedSelection,
  VenueDto,
  VenueWithDetails,
} from '../types/venue.types';

export const toOfferDto = (offer: Offer): OfferDto => ({
  id: offer.id,
  code: offer.code,
  title: offer.title,
  description: offer.description,
  label:
    offer.kind === 'flat'
      ? `₹${toRupees(offer.value).toLocaleString('en-IN')} OFF`
      : `${bpsToPercent(offer.value)}% OFF`,
  kind: offer.kind,
  value: offer.kind === 'flat' ? toRupees(offer.value) : bpsToPercent(offer.value),
  maxDiscount: offer.maxDiscountPaise === null ? null : toRupees(offer.maxDiscountPaise),
  minSubtotal: toRupees(offer.minSubtotalPaise),
  minHours: offer.minHours,
  weekdaysOnly: offer.weekdaysOnly,
  accent: offer.accent,
  active: offer.active,
  validFrom: offer.validFrom,
  validTo: offer.validTo,
});

const toSettingsDto = (venue: VenueWithDetails): SettingsDto => {
  const settings = venue.settings;
  return {
    hourlyRate: toRupees(settings?.hourlyRatePaise ?? 0),
    additionalCharge: toRupees(settings?.additionalChargePaise ?? 0),
    gstRate: bpsToPercent(settings?.gstRateBps ?? 0),
    updatedAt: settings?.updatedAt,
  };
};

export const toVenueDto = (venue: VenueWithDetails): VenueDto => ({
  id: venue.id,
  name: venue.name,
  area: venue.area,
  city: venue.city,
  address: venue.address,
  description: venue.description,
  phone: venue.phone,
  settings: toSettingsDto(venue),
  pitches: venue.pitches.map(pitch => ({
    id: pitch.id,
    name: pitch.name,
    size: pitch.size,
    format: pitch.format,
  })),
  openHour: venue.openHour,
  closeHour: venue.closeHour,
  minHours: venue.minHours,
  maxHours: venue.maxHours,
  advanceDays: venue.advanceDays,
});

export class VenueService {
  constructor(private readonly venueRepository: VenueRepository) {}

  async listVenues(): Promise<VenueDto[]> {
    const venues = await this.venueRepository.findAll();
    return venues.map(toVenueDto);
  }

  async getVenueEntity(venueId: string): Promise<VenueWithDetails> {
    const venue = await this.venueRepository.findById(venueId);
    if (!venue || !venue.settings) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.VENUE_NOT_FOUND);
    }
    return venue;
  }

  async getVenue(venueId: string): Promise<VenueDto> {
    return toVenueDto(await this.getVenueEntity(venueId));
  }

  async getSlots(venueId: string, date: string, pitchId?: string, now: Date = new Date()) {
    const venue = await this.getVenueEntity(venueId);
    const pitch = this.resolvePitch(venue, pitchId);
    const rows = await this.venueRepository.findSlotsForDay(pitch.id, date);

    const statusByHour = new Map<number, SlotStatus>();
    for (const row of rows) {
      if (row.booking) {
        const { status, expiresAt } = row.booking;
        if (status === 'upcoming' || status === 'completed') statusByHour.set(row.hour, 'booked');
        else if (status === 'pending' && (!expiresAt || expiresAt > now)) {
          statusByHour.set(row.hour, 'held');
        }
      } else if (row.hold && row.hold.expiresAt > now) {
        statusByHour.set(row.hour, 'held');
      }
    }

    const price = toRupees(venue.settings?.hourlyRatePaise ?? 0);
    const slots: SlotDto[] = [];
    for (let hour = venue.openHour; hour < venue.closeHour; hour++) {
      const isPast = slotStartInstant(date, hour) <= now;
      slots.push({
        hour,
        label: `${formatHour(hour)} - ${formatHour(hour + 1)}`,
        status: isPast ? 'past' : (statusByHour.get(hour) ?? 'available'),
        price,
        isPeak: false,
      });
    }

    return { date, pitchId: pitch.id, slots };
  }

  // Enforces venue rules for a (pitch, date, hours) selection before any slot is locked.
  async validateSelection(
    venueId: string,
    pitchId: string | undefined,
    date: string,
    hours: number[],
    now: Date = new Date(),
  ): Promise<ValidatedSelection> {
    const venue = await this.getVenueEntity(venueId);
    const pitch = this.resolvePitch(venue, pitchId);

    if (hours.length < venue.minHours || hours.length > venue.maxHours) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        ValidationMessages.hoursOutOfRange(venue.minHours, venue.maxHours),
      );
    }
    if (hours[0] < venue.openHour || hours[hours.length - 1] >= venue.closeHour) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.OUTSIDE_OPENING_HOURS);
    }

    const today = todayInVenue(now);
    if (date < today || date > addDaysToDate(today, venue.advanceDays)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.DATE_OUT_OF_RANGE);
    }
    if (slotStartInstant(date, hours[0]) <= now) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.SLOT_IN_PAST);
    }

    return { venue, pitchId: pitch.id, date, hours, startHour: hours[0] };
  }

  async getSettings(venueId: string) {
    const venue = await this.getVenueEntity(venueId);
    const settings = venue.settings;
    // "Customer preview - 1 hour booking example" on the Rates & charges screen.
    const preview = calculatePrice({
      hourlyRatePaise: settings?.hourlyRatePaise ?? 0,
      hours: 1,
      additionalChargePaise: settings?.additionalChargePaise ?? 0,
      gstRateBps: settings?.gstRateBps ?? 0,
    });
    return {
      ...toSettingsDto(venue),
      preview: {
        hours: 1,
        hourlyBookingCharge: toRupees(preview.subtotalPaise),
        additionalCharge: toRupees(preview.platformFeePaise),
        taxes: toRupees(preview.taxesPaise),
        totalPayable: toRupees(preview.totalPaise),
      },
      openHour: venue.openHour,
      closeHour: venue.closeHour,
      minHours: venue.minHours,
      maxHours: venue.maxHours,
      advanceDays: venue.advanceDays,
    };
  }

  async updateSettings(venueId: string, input: UpdateSettingsInput) {
    const venue = await this.getVenueEntity(venueId);
    const { hourlyRate, additionalCharge, gstRate, ...hoursConfig } = input;

    const openHour = hoursConfig.openHour ?? venue.openHour;
    const closeHour = hoursConfig.closeHour ?? venue.closeHour;
    const minHours = hoursConfig.minHours ?? venue.minHours;
    const maxHours = hoursConfig.maxHours ?? venue.maxHours;
    if (openHour >= closeHour || minHours > maxHours) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.INVALID_DATA);
    }

    await this.venueRepository.upsertSettings(venueId, {
      ...(hourlyRate !== undefined && { hourlyRatePaise: toPaise(hourlyRate) }),
      ...(additionalCharge !== undefined && { additionalChargePaise: toPaise(additionalCharge) }),
      ...(gstRate !== undefined && { gstRateBps: percentToBps(gstRate) }),
    });
    if (Object.keys(hoursConfig).length > 0) {
      await this.venueRepository.updateVenue(venueId, hoursConfig);
    }

    return this.getSettings(venueId);
  }

  async listActiveOffers(venueId: string): Promise<OfferDto[]> {
    await this.getVenueEntity(venueId);
    const offers = await this.venueRepository.findActiveOffers(venueId, new Date());
    return offers.map(toOfferDto);
  }

  async listAllOffers(venueId: string): Promise<OfferDto[]> {
    await this.getVenueEntity(venueId);
    const offers = await this.venueRepository.findAllOffers(venueId);
    return offers.map(toOfferDto);
  }

  async createOffer(venueId: string, input: CreateOfferInput): Promise<OfferDto> {
    await this.getVenueEntity(venueId);
    if (await this.venueRepository.findOfferByCode(venueId, input.code)) {
      throw new ApiError(StatusCodes.CONFLICT, ValidationMessages.alreadyExists('Offer code'));
    }
    const offer = await this.venueRepository.createOffer({
      venueId,
      code: input.code,
      title: input.title ?? '',
      description: input.description ?? '',
      kind: input.kind,
      value: input.kind === 'flat' ? toPaise(input.value) : percentToBps(input.value),
      maxDiscountPaise: input.maxDiscount ? toPaise(input.maxDiscount) : null,
      minSubtotalPaise: toPaise(input.minSubtotal ?? 0),
      minHours: input.minHours ?? 1,
      weekdaysOnly: input.weekdaysOnly ?? false,
      accent: input.accent ?? 'lime',
      active: input.active ?? true,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
    });
    return toOfferDto(offer);
  }

  async updateOffer(venueId: string, offerId: string, input: UpdateOfferInput): Promise<OfferDto> {
    const existing = await this.venueRepository.findOfferById(offerId);
    if (!existing || existing.venueId !== venueId) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.RECORD_NOT_FOUND);
    }
    const kind = input.kind ?? existing.kind;
    const offer = await this.venueRepository.updateOffer(offerId, {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.minHours !== undefined && { minHours: input.minHours }),
      ...(input.weekdaysOnly !== undefined && { weekdaysOnly: input.weekdaysOnly }),
      ...(input.accent !== undefined && { accent: input.accent }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.value !== undefined && {
        value: kind === 'flat' ? toPaise(input.value) : percentToBps(input.value),
      }),
      ...(input.maxDiscount !== undefined && {
        maxDiscountPaise: input.maxDiscount ? toPaise(input.maxDiscount) : null,
      }),
      ...(input.minSubtotal !== undefined && { minSubtotalPaise: toPaise(input.minSubtotal) }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
      ...(input.validTo !== undefined && { validTo: input.validTo }),
    });
    return toOfferDto(offer);
  }

  // Returns an applicable offer for the code or throws a client-facing error.
  // `date` is the booked day (weekday-only offers are judged on it, not on today).
  async resolveOffer(
    venueId: string,
    code: string,
    subtotalPaise: number,
    hours: number,
    date?: string,
    now = new Date(),
  ) {
    const offer = await this.venueRepository.findOfferByCode(venueId, code.toUpperCase());
    const isLive =
      offer &&
      offer.active &&
      (!offer.validFrom || offer.validFrom <= now) &&
      (!offer.validTo || offer.validTo >= now);
    if (!offer || !isLive) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.INVALID_OFFER);
    }
    if (hours < offer.minHours) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        ValidationMessages.offerMinHours(offer.code, offer.minHours),
      );
    }
    if (offer.weekdaysOnly && date && WEEKEND_DAYS.includes(parseDateOnly(date).getUTCDay())) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.offerWeekdaysOnly(offer.code));
    }
    if (subtotalPaise < offer.minSubtotalPaise) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.OFFER_MIN_SUBTOTAL);
    }
    return offer;
  }

  private resolvePitch(venue: VenueWithDetails, pitchId?: string) {
    const pitch = pitchId ? venue.pitches.find(p => p.id === pitchId) : venue.pitches[0];
    if (!pitch) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.PITCH_NOT_FOUND);
    }
    return pitch;
  }
}
