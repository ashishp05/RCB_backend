export const ResponseMessages = Object.freeze({
  // Generic & Helper Responses
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  FETCHED: 'Fetched successfully',

  // Auth Responses
  LOGIN_SUCCESSFUL: 'Logged in successfully',
  LOGOUT_SUCCESSFUL: 'Logged out successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET_EMAIL_SENT: 'If an account exists for this email, a reset link has been sent.',
  PASSWORD_RESET_DONE: 'Password has been reset. You can log in now.',
  OTP_SENT: 'We sent a 6-digit code to your mobile number.',

  // Box cricket Responses
  VISITOR_SAVED: 'Visitor saved',
  HOLD_CREATED: 'Slots held',
  HOLD_RELEASED: 'Hold released',
  BOOKING_CREATED: 'Booking created',
  BOOKING_CONFIRMED: 'Booking confirmed',
  BOOKING_CANCELLED: 'Booking cancelled',
  BOOKING_RESCHEDULED: 'Booking rescheduled',
  ORDER_CREATED: 'Payment order created',
  PAYMENT_VERIFIED: 'Payment verified',
  SETTINGS_UPDATED: 'Settings updated',
  WEBHOOK_PROCESSED: 'Webhook processed',
});

export const ValidationMessages = Object.freeze({
  // Generic / System errors
  SOMETHING_WENT_WRONG: 'Something went wrong',
  INVALID_DATA: 'Received data is not valid',
  RECORD_NOT_FOUND: 'Record not found',
  DUPLICATE_RECORD: 'A record with these details already exists',
  UNAUTHORIZED: 'Unauthorized request',
  NOT_ALLOWED: 'You are not allowed to perform this action',
  BAD_REQUEST: 'Bad request',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  ROUTE_NOT_FOUND: 'Route not found or wrong API method',
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  ORIGIN_HEADER_IS_MISSING: 'Origin header is missing',
  ACCESS_FORBIDDEN: 'Access Forbidden',

  // Auth Errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_INACTIVE: 'Account is inactive or suspended',
  ACCOUNT_LOCKED: 'Too many failed attempts. Try again in a few minutes.',
  SESSION_EXPIRED: 'Session expired. Please log in again.',
  OLD_PASSWORD_INCORRECT: 'Current password is incorrect',
  PASSWORD_SAME_AS_OLD: 'New password must be different from the current password',
  RESET_TOKEN_INVALID: 'This reset link is invalid or has expired',
  STAFF_NOT_FOUND: 'Staff account not found',
  STAFF_EMAIL_EXISTS: 'A staff account with this email already exists',
  CANNOT_DEACTIVATE_SELF: 'You cannot deactivate or demote your own account',
  LAST_ADMIN: 'At least one active admin account is required',
  PASSWORD_RULES: 'Password must be at least 8 characters and include a letter and a number',

  // Customer login (OTP) Errors
  LOGIN_REQUIRED: 'Please log in with your mobile number to continue.',
  OTP_INVALID: 'That code is not correct. Please check and try again.',
  OTP_EXPIRED: 'This code has expired. Please request a new one.',
  OTP_TOO_MANY_ATTEMPTS: 'Too many wrong codes. Please request a new one.',
  OTP_SEND_FAILED: 'Could not send the OTP. Please try again.',
  otpResendWait: (seconds: number) =>
    `Please wait ${seconds} seconds before requesting a new code.`,
  OTP_HOURLY_LIMIT: 'Too many codes requested for this number. Try again in an hour.',
  ENTER_VALID_OTP: 'Enter the 6-digit code',
  ENTER_VALID_EMAIL: 'Enter a valid email',
  ENTER_VALID_BIRTHDAY: 'Birthday must be a past date in YYYY-MM-DD format',
  HOLD_NOT_YOURS: 'This hold belongs to a different mobile number',

  // Input Errors
  ENTER_VALID_NAME: 'Please provide a valid name',
  NAME_LETTERS_ONLY: 'Name can only contain letters, spaces, dots, apostrophes and hyphens',
  ENTER_VALID_MOBILE: 'Please provide a valid 10-digit mobile number',
  INVALID_DATE: 'Date must be in YYYY-MM-DD format',
  INVALID_HOUR: 'Hour must be between 0 and 23',
  HOURS_NOT_CONSECUTIVE: 'Selected hours must be consecutive',

  // Venue Errors
  VENUE_NOT_FOUND: 'Venue not found',
  PITCH_NOT_FOUND: 'Pitch not found',
  VISITOR_NOT_FOUND: 'Visitor not found',
  DATE_OUT_OF_RANGE: 'Bookings are open from today up to the advance booking window',
  OUTSIDE_OPENING_HOURS: 'Selected hours are outside opening hours',
  SLOT_IN_PAST: 'That slot has already passed',
  SLOT_UNAVAILABLE: 'That slot is not available.',
  hoursOutOfRange: (min: number, max: number) =>
    `You can book between ${min} and ${max} hours at a time.`,

  // Hold & Booking Errors
  HOLD_NOT_FOUND: 'Hold not found',
  HOLD_EXPIRED: 'Your hold has expired',
  HOLD_PHONE_MISMATCH: 'This hold belongs to a different mobile number',
  BOOKING_NOT_FOUND: 'Booking not found',
  BOOKING_NOT_PENDING: 'Booking is not awaiting payment',
  BOOKING_NOT_ACTIVE: 'Only upcoming or pending bookings can be changed',
  BOOKING_PHONE_MISMATCH: 'Mobile number does not match this booking',
  RESCHEDULE_TOO_LATE: 'This booking can no longer be rescheduled',
  RESCHEDULE_SAME_SLOT: 'Pick a different date or time',
  INVALID_OFFER: 'This offer code is not valid',
  OFFER_MIN_SUBTOTAL: 'Booking amount is too low for this offer code',
  // Verbatim from the app's offer checks.
  offerMinHours: (code: string, hours: number) =>
    `${code} needs at least ${hours === 1 ? '1 hr' : `${hours} hrs`} of booking.`,
  offerWeekdaysOnly: (code: string) => `${code} is valid on weekdays only (Mon-Fri).`,
  ONLINE_PAYMENT_ONLY: 'Cash is only accepted at the counter',

  // Payment Errors
  PAYMENT_NOT_FOUND: 'Payment order not found',
  PAYMENT_SIGNATURE_INVALID: 'Payment verification failed',
  PAYMENT_NOT_COMPLETED: 'The payment was not completed. No money has been taken.',
  PAYMENT_PROVIDER_ERROR: 'Payment provider error. Please try again.',
  PAYMENT_NOT_CONFIGURED: 'Online payments are not configured',
  WEBHOOK_SIGNATURE_INVALID: 'Invalid webhook signature',

  // Dynamic field helper functions
  required: (field: string) => `${field} is required`,
  invalid: (field: string) => `Invalid ${field}`,
  min: (field: string, length: number) => `${field} must be at least ${length} characters`,
  max: (field: string, length: number) => `${field} cannot exceed ${length} characters`,
  alreadyExists: (field: string) => `${field} already exists`,
  invalidFileType: (field: string, allowed: string) =>
    `Invalid file type for '${field}'. Allowed types: ${allowed}`,
  fileSizeExceeded: (field: string, limitMB: string) =>
    `File size for '${field}' exceeds maximum limit of ${limitMB}MB`,
  uploadError: (msg: string) => `File upload failed: ${msg}`,
});
