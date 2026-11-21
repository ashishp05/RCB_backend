// Indian mobile numbers are stored as plain 10 digits, e.g. 9876543210.
const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export const normalizeIndianMobile = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const isValidIndianMobile = (value: string): boolean =>
  MOBILE_PATTERN.test(normalizeIndianMobile(value));

// E.164 for SMS providers: +919876543210
export const toE164India = (phone: string): string => `+91${normalizeIndianMobile(phone)}`;
