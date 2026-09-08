/**
 * Framework-agnostic formatting helpers shared by the landing and the portal.
 * Pure functions only — no React, no DOM, no framework imports.
 */

/** Licence keys are shown grouped in 4s: NVHXXXXXXXXXXXX -> NVH-XXXX-XXXX-XXXX. */
export function formatLicenseKey(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return cleaned.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

/** Money for display. Currency travels with the figure — never assume USD. */
export function formatMoney(amount: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

/** Short absolute date, e.g. "7 Sep 2026". */
export function formatDate(value: string | number | Date, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}
