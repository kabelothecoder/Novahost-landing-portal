/**
 * Everything about this site that is a fact rather than a design decision.
 *
 * Prices, URLs and legal details live here so a change is one edit, not a
 * search across nine components. Anything that could plausibly differ between
 * environments reads an env var first and falls back to the real production
 * value — a missing var should degrade to "correct", never to "undefined".
 */

/** Where the signed Android APK is served from. */
export const APK_URL =
  import.meta.env.VITE_APK_URL ??
  "https://epulmnfbxjmaimefhofp.supabase.co/storage/v1/object/public/downloads/novahost.apk";

/**
 * The iOS app is an installable web app, not an App Store listing. This is the
 * single install origin — a handset that installs from anywhere else gets a
 * second device ID and burns its licence binding.
 */
export const IOS_APP_URL = import.meta.env.VITE_IOS_APP_URL ?? "https://app.novahost-ea.app";

/**
 * The mentor portal now lives on its own domain. This site markets the app, so
 * there is no mentor signup, no mentor login and no mentor pricing on it — but
 * a mentor who lands here still needs a way through. Set VITE_PORTAL_URL and a
 * single discreet footer link appears; leave it unset and nothing renders.
 */
export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL ?? "";

/** Marketing prices in Rand. PayFast collects R1 more on the first two to
 *  absorb the card fee — see generate-payfast-checkout. Do not "fix" these to
 *  match the collected amount; the round number is the advertised price. */
export const PRICES = {
  app: 599,
  scanner: 349,
  deviceMove: 150,
} as const;

export const SUPPORT_EMAIL = "kabelomzwakhe@gmail.com";
