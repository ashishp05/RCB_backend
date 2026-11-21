import { Prisma } from '@prisma/client';
import { z } from 'zod';

import {
  createOfferSchema,
  slotsQuerySchema,
  updateOfferSchema,
  updateSettingsSchema,
} from '../schemas/venue.schema';

export type SlotsQueryInput = z.infer<typeof slotsQuerySchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

export const venueWithDetails = Prisma.validator<Prisma.VenueDefaultArgs>()({
  include: {
    settings: true,
    pitches: { where: { active: true }, orderBy: { name: 'asc' } },
  },
});

export type VenueWithDetails = Prisma.VenueGetPayload<typeof venueWithDetails>;

export type SlotStatus = 'available' | 'booked' | 'held' | 'past';

export interface SlotDto {
  hour: number;
  label: string;
  status: SlotStatus;
  price: number;
  isPeak: boolean;
}

export interface SettingsDto {
  hourlyRate: number;
  additionalCharge: number;
  gstRate: number;
  updatedAt?: Date;
}

export interface PitchDto {
  id: string;
  name: string;
  size: string;
  format: string;
}

export interface VenueDto {
  id: string;
  name: string;
  area: string;
  city: string;
  address: string;
  description: string;
  phone: string;
  settings: SettingsDto;
  pitches: PitchDto[];
  openHour: number;
  closeHour: number;
  minHours: number;
  maxHours: number;
  advanceDays: number;
}

export interface OfferDto {
  id: string;
  code: string;
  description: string;
  kind: 'flat' | 'percent';
  // flat: rupees off. percent: percent off.
  value: number;
  maxDiscount: number | null;
  minSubtotal: number;
  active: boolean;
  validFrom: Date | null;
  validTo: Date | null;
}

export interface ValidatedSelection {
  venue: VenueWithDetails;
  pitchId: string;
  date: string;
  hours: number[];
  startHour: number;
}
