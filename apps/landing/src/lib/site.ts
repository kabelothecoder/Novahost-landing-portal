/**
 * Everything about this site that is a fact rather than a design decision.
 *
 * Prices, URLs and legal details live here so a change is one edit, not a
 * search across nine components. Anything that could plausibly differ between
 * environments reads an env var first and falls back to the real production
 * value — a missing var should degrade to "correct", never to "undefined".
 */

/**
 * Where the signed Android APK is served from.
 *
 * `||` and not `??`, and this has bitten before: the Vercel project once had
 * `VITE_APK_URL` set to an empty string, `??` passed `""` straight through as a
 * legitimate value, and the download button rendered permanently disabled on
 * the live site. An unset *or blank* override must fall through to the default.
 */
export const APK_URL =
  import.meta.env.VITE_APK_URL ||
  "https://epulmnfbxjmaimefhofp.supabase.co/storage/v1/object/public/downloads/novahost.apk";

/**
 * The iOS app is an installable web app, not an App Store listing, so this is
 * a URL people open rather than a store page.
 *
 * It is also the app's ONE install origin, and that is load-bearing rather
 * than tidy: the handset's device id is a random UUID kept in origin-scoped
 * storage, so a second origin means a second identity, a `device_mismatch`,
 * and a user locked out of something they paid for. Whatever this points at
 * must be the only place the app is served.
 */
export const IOS_APP_URL = import.meta.env.VITE_IOS_APP_URL || "https://novahost-app.vercel.app";

/** Marketing prices in Rand. PayFast collects R1 more on the first two to
 *  absorb the card fee — see generate-payfast-checkout. Do not "fix" these to
 *  match the collected amount; the round number is the advertised price. */
export const PRICES = {
  app: 599,
  scanner: 349,
  deviceMove: 150,
} as const;

export const SUPPORT_EMAIL = "kabelomzwakhe@gmail.com";
