import { VENUE_TIME_ZONE } from '../constants/config.constants';

// India has no daylight saving, so a fixed offset is exact.
const VENUE_UTC_OFFSET = '+05:30';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isValidDateString = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

// Calendar dates (Postgres DATE) are carried as UTC midnight.
export const parseDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const formatDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

export const addDaysToDate = (value: string, days: number): string =>
  formatDateOnly(new Date(parseDateOnly(value).getTime() + days * DAY_MS));

export const todayInVenue = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: VENUE_TIME_ZONE }).format(now);

// The real instant a slot starts, e.g. ('2026-03-22', 19) -> 2026-03-22T13:30:00Z.
export const slotStartInstant = (date: string, hour: number): Date => {
  const midnight = new Date(`${date}T00:00:00${VENUE_UTC_OFFSET}`);
  return new Date(midnight.getTime() + hour * 60 * 60 * 1000);
};

export const hoursUntil = (instant: Date, now: Date = new Date()): number =>
  (instant.getTime() - now.getTime()) / (60 * 60 * 1000);

export const minutesFromNow = (minutes: number, now: Date = new Date()): Date =>
  new Date(now.getTime() + minutes * 60 * 1000);

// 19 -> "7 PM", 0 -> "12 AM", 24 -> "12 AM".
export const formatHour = (hour: number): string => {
  const normalized = hour % 24;
  const suffix = normalized < 12 ? 'AM' : 'PM';
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display} ${suffix}`;
};

export const formatSlotRange = (startHour: number, hours: number): string =>
  `${formatHour(startHour)} - ${formatHour(startHour + hours)}`;

// "2026-03-22" -> "Sun, 22 Mar 2026".
export const formatDisplayDate = (date: string): string =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDateOnly(date));
