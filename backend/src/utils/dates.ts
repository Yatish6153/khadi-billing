/**
 * The shop works in Indian Standard Time (UTC+5:30, no daylight saving),
 * but the server may run in UTC (e.g. on Railway). These helpers compute
 * IST day/month boundaries as UTC Date objects for database queries.
 */
const IST_OFFSET_MS = 330 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight IST of the day containing `date`, as a UTC instant. */
export function istDayStart(date: Date = new Date()): Date {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

/** Midnight IST on the 1st of the month containing `date`, as a UTC instant. */
export function istMonthStart(date: Date = new Date()): Date {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  ist.setUTCDate(1);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

/** Midnight IST at the start of a "YYYY-MM-DD" day, as a UTC instant. */
export function istStartOfKey(key: string): Date {
  return new Date(`${key}T00:00:00+05:30`);
}

/** "YYYY-MM-DD" of the IST calendar day containing `date`. */
export function istDateKey(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
