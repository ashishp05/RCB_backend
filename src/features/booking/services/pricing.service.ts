import { Offer } from '@prisma/client';

import { bpsToPercent, toRupees } from '../../../utils/money.util';
import { PriceDto, PriceSnapshot } from '../types/booking.types';

export interface PricingInput {
  hourlyRatePaise: number;
  hours: number;
  additionalChargePaise: number;
  gstRateBps: number;
  offer?: Offer | null;
}

export const discountForOffer = (offer: Offer, subtotalPaise: number): number => {
  const raw =
    offer.kind === 'flat' ? offer.value : Math.round((subtotalPaise * offer.value) / 10_000);
  const capped = offer.maxDiscountPaise === null ? raw : Math.min(raw, offer.maxDiscountPaise);
  return Math.max(0, Math.min(capped, subtotalPaise));
};

// subtotal = hourlyRate x hours; total = subtotal - discount + additionalCharge + taxes.
// GST applies to the amount actually charged (after discount, including the platform fee).
export const calculatePrice = (input: PricingInput): PriceSnapshot => {
  const subtotalPaise = input.hourlyRatePaise * input.hours;
  const discountPaise = input.offer ? discountForOffer(input.offer, subtotalPaise) : 0;
  const taxablePaise = subtotalPaise - discountPaise + input.additionalChargePaise;
  const taxesPaise = Math.round((taxablePaise * input.gstRateBps) / 10_000);

  return {
    hours: input.hours,
    hourlyRatePaise: input.hourlyRatePaise,
    subtotalPaise,
    discountPaise,
    platformFeePaise: input.additionalChargePaise,
    gstRateBps: input.gstRateBps,
    taxesPaise,
    totalPaise: taxablePaise + taxesPaise,
    couponCode: input.offer?.code ?? null,
  };
};

export const toPriceDto = (price: PriceSnapshot): PriceDto => ({
  subtotal: toRupees(price.subtotalPaise),
  discount: toRupees(price.discountPaise),
  platformFee: toRupees(price.platformFeePaise),
  taxes: toRupees(price.taxesPaise),
  total: toRupees(price.totalPaise),
  hourlyRate: toRupees(price.hourlyRatePaise),
  hours: price.hours,
  gstRate: bpsToPercent(price.gstRateBps),
  couponCode: price.couponCode,
});
