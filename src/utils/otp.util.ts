import crypto from 'crypto';

import { env } from '../config/env-config';

// A random numeric code, e.g. "482913". Uses a CSPRNG so codes cannot be predicted.
export const generateOtp = (length: number): string =>
  Array.from({ length }, () => crypto.randomInt(0, 10)).join('');

// Keyed hash: a leaked otp_codes table cannot be brute-forced offline without JWT_SECRET.
export const hashOtp = (phone: string, code: string): string =>
  crypto.createHmac('sha256', env.JWT_SECRET).update(`${phone}:${code}`).digest('hex');

export const otpMatches = (phone: string, code: string, expectedHash: string): boolean => {
  const actual = Buffer.from(hashOtp(phone, code), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
