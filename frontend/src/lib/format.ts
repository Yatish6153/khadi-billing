/** Indian-locale formatting helpers shared across the app. */

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ₹1,23,456.50 (Indian digit grouping) */
export function formatINR(value: number, { whole = false } = {}): string {
  return (whole ? inrWhole : inr).format(value);
}

/** Compact axis labels: ₹950, ₹1.2K, ₹3.4L, ₹1.1Cr */
export function formatINRCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${trim(value / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${trim(value / 1e5)}L`;
  if (abs >= 1e3) return `₹${trim(value / 1e3)}K`;
  return `₹${Math.round(value)}`;
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** Bill-book style date: 28-Mar-26 */
export function formatBillDate(input: string | Date): string {
  const d = new Date(input);
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

/** "28 Sep" from a YYYY-MM-DD key (no timezone shift) */
export function formatDayKey(key: string, withWeekday = false): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withWeekday ? { weekday: 'short' } : {}),
  });
}

/** Quantities: up to 3 decimals, no trailing zeros (2.750 → 2.75) */
export function formatQty(value: number): string {
  return Number(value.toFixed(3)).toString();
}
