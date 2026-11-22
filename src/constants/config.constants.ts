export const RATE_LIMIT = {
  GLOBAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  GLOBAL_MAX: 600,
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_MAX: 10,
  // Customer OTP send/verify, per IP. Kept separate so customers never lock staff out.
  OTP_WINDOW_MS: 15 * 60 * 1000,
  OTP_MAX: 30,
};

export const MAX_PAGE_SIZE = 100;

export const BCRYPT_SALT_ROUNDS = 10;

export const APP_NAME = 'The Riverside Cricket Box';

// The venue operates on Indian time: "today", "past" slots and refund cutoffs use IST.
export const VENUE_TIME_ZONE = 'Asia/Kolkata';

export const BOOKING_RULES = Object.freeze({
  // A hold reserves slots while the visitor fills in details.
  HOLD_TTL_MINUTES: 8,
  // An unpaid pending booking keeps its slots this long before release.
  PENDING_PAYMENT_TTL_MINUTES: 15,
  // Refund tiers by hours before start (from the app's FAQ): 100% at 24h+, 50% at 6h+, else none.
  REFUND_TIERS: [
    { minHoursBefore: 24, percent: 100 },
    { minHoursBefore: 6, percent: 50 },
  ],
  // Reschedule allowed until this many hours before the original start.
  RESCHEDULE_CUTOFF_HOURS: 2,
  // Background sweep for expired holds, unpaid bookings and finished games.
  SWEEP_INTERVAL_MS: 60 * 1000,
  MAX_PLAYERS: 30,
});

export const BOOKING_ID_PREFIX = 'BX';
export const BOOKING_ID_LENGTH = 6;
// No 0/O/1/I so ids read clearly over the phone.
export const BOOKING_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const ADMIN_AUTH = Object.freeze({
  PASSWORD_MIN_LENGTH: 8,
  MAX_FAILED_LOGINS: 5,
  LOCKOUT_MINUTES: 15,
  RESET_TOKEN_TTL_MINUTES: 30,
});

// Customer-site login by SMS one-time code.
export const CUSTOMER_AUTH = Object.freeze({
  OTP_LENGTH: 6,
  OTP_TTL_MINUTES: 5,
  // Wait this long before another code can be sent to the same number.
  OTP_RESEND_SECONDS: 30,
  // At most this many codes per number per hour.
  OTP_MAX_SENDS_PER_HOUR: 5,
  // Wrong guesses allowed on one code before it is burnt.
  OTP_MAX_ATTEMPTS: 5,
  TOKEN_ROLE: 'visitor',
});

// Mon-Fri check for weekday-only offers (JS getUTCDay on a date-only value: 0 = Sunday).
export const WEEKEND_DAYS = [0, 6];

export const OfferAccents = ['lime', 'ball', 'sky', 'amber'] as const;

export const StaffRoles = Object.freeze({
  ADMIN: 'admin',
  STAFF: 'staff',
} as const);

export type StaffRole = (typeof StaffRoles)[keyof typeof StaffRoles];

export const PaymentKindLabels = Object.freeze({
  upi_qr: 'UPI QR',
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  cash: 'Cash',
} as const);

export const CURRENCY = 'INR';
