import crypto from 'crypto';

import {
  BOOKING_ID_ALPHABET,
  BOOKING_ID_LENGTH,
  BOOKING_ID_PREFIX,
} from '../constants/config.constants';

const randomFromAlphabet = (length: number, alphabet: string): string => {
  let output = '';
  for (let i = 0; i < length; i++) {
    output += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return output;
};

// e.g. BXK7Q2M9
export const generateBookingId = (): string =>
  `${BOOKING_ID_PREFIX}${randomFromAlphabet(BOOKING_ID_LENGTH, BOOKING_ID_ALPHABET)}`;

// e.g. h_9f2c1a7b3d4e
export const generatePrefixedId = (prefix: string): string =>
  `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
