/**
 * Display helpers.
 *
 * Everything the business collects is in Rand, so `money` says so rather than
 * taking a currency argument nobody would ever vary. If that stops being true,
 * make the currency travel with the figure — a number formatted in the wrong
 * currency is worse than an unformatted one.
 */

const ZAR = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 2,
});

const ZAR_WHOLE = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

export const money = (amount: number, whole = false) =>
  (whole ? ZAR_WHOLE : ZAR).format(Number.isFinite(amount) ? amount : 0);

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const DATETIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const date = (value: string | null | undefined) => (value ? DATE.format(new Date(value)) : "—");

export const dateTime = (value: string | null | undefined) =>
  value ? DATETIME.format(new Date(value)) : "—";

/** "3 days ago", "in 2 months". Falls back to an em dash on null. */
export function relative(value: string | null | undefined): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "—";

  const diff = then - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/** "2026-09" -> "Sep 2026", for the month axis of a chart. */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(d);
}

/** 0.417 -> "42%" */
export const percent = (fraction: number) =>
  `${Math.round((Number.isFinite(fraction) ? fraction : 0) * 100)}%`;

/**
 * Device ids and licence keys are long and only their ends are recognisable.
 * Middle-truncate so both ends survive.
 */
export function shortId(value: string | null | undefined, keep = 6): string {
  if (!value) return "—";
  if (value.length <= keep * 2 + 1) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}
