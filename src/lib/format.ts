// Currency + timezone aware formatting helpers. All "today" / date-range logic
// runs in the company timezone from Settings, not the browser's timezone, so a
// site in Karachi sees the same "today" no matter where the viewer is.

export const DEFAULT_CURRENCY = 'PKR';
export const DEFAULT_TIMEZONE = 'Asia/Karachi';

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: 'Rs',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

function withSymbol(currency: string, amountText: string): string {
  const symbol = currencySymbol(currency);
  // Single-character symbols hug the number ($1,200); word-like ones get a space (Rs 1,200).
  return symbol.length === 1 ? `${symbol}${amountText}` : `${symbol} ${amountText}`;
}

export function formatMoney(amount: number, currency: string): string {
  return withSymbol(currency, Math.round(amount).toLocaleString('en-US'));
}

// Compact form for KPI tiles: Rs 950, Rs 45K, Rs 1.8M
export function formatMoneyShort(amount: number, currency: string): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return withSymbol(currency, `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`);
  if (abs >= 1_000) return withSymbol(currency, `${Math.round(amount / 1_000)}K`);
  return formatMoney(amount, currency);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function safeTz(tz: string): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

function parts(date: Date, tz: string) {
  const out: Record<string, string> = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz(tz),
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).forEach(p => { out[p.type] = p.value; });
  return out;
}

// YYYY-MM-DD for the given instant, as seen in the timezone.
export function dateStrInTz(date: Date, tz: string): string {
  const p = parts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function todayInTz(tz: string): string {
  return dateStrInTz(new Date(), tz);
}

// HH:MM (24h) for "now" in the timezone — used to block future end times.
export function nowHMInTz(tz: string): string {
  const p = parts(new Date(), tz);
  return `${p.hour}:${p.minute}`;
}

// Calendar arithmetic on a YYYY-MM-DD string (timezone-free).
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function lastNDays(n: number, tz: string): { date: string; label: string }[] {
  const today = todayInTz(tz);
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    days.push({ date, label });
  }
  return days;
}

export function lastNMonths(n: number, tz: string): { key: string; label: string }[] {
  const [year, month] = todayInTz(tz).split('-').map(Number);
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    const key = d.toISOString().slice(0, 7);
    months.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) });
  }
  return months;
}

export function formatTimeInTz(date: Date, tz: string): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: safeTz(tz) });
}

export function formatLongDateInTz(date: Date, tz: string): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: safeTz(tz) });
}

export function formatDateTimeInTz(date: Date, tz: string): string {
  return date.toLocaleString('en-US', { timeZone: safeTz(tz) });
}
