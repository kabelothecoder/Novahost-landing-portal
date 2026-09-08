/**
 * NovaHost MARKETING brand tokens.
 *
 * Scope: the landing page, the licence-key / auth emails, and the portal's own
 * marketing surfaces (apps/portal/src/pages/Landing.tsx). NOT the portal's
 * functional UI — that is a deliberately separate, neutral dual-theme system
 * (see apps/portal/src/index.css) and must not be pulled toward this gradient.
 *
 * Source of truth: the shipped licence-key email
 * (apps/portal/supabase/functions/send-license-email). Values below currently
 * drift across files — reconcile callers onto these, do not add new variants:
 *   ground   apps/landing/app/layout.tsx  #060609   |  app/page.tsx  #121212
 *   gradient landing components sometimes omit the middle stop
 */

/** Deep indigo-black page ground. */
export const GROUND = "#07070E";

/** Raised card / panel on the ground. */
export const SURFACE = "#0E1015";

/** The robot mark's visor, magenta → violet → cyan. The one brand gradient. */
export const VISOR_GRADIENT_STOPS = ["#F0439E", "#A855F7", "#22C9E8"] as const;

/** `background-image` value for the visor gradient (left→right). */
export const VISOR_GRADIENT_CSS = `linear-gradient(90deg, ${VISOR_GRADIENT_STOPS.join(", ")})`;

/** Single-colour accent (cyan pole of the visor) for links / focus rings. */
export const ACCENT = "#22C9E8";

/** Warm and cool poles, for the hero's two-sided bloom. */
export const BLOOM_WARM = "#F0439E";
export const BLOOM_COOL = "#22C9E8";

export const BRAND = {
  GROUND,
  SURFACE,
  ACCENT,
  BLOOM_WARM,
  BLOOM_COOL,
  VISOR_GRADIENT_STOPS,
  VISOR_GRADIENT_CSS,
} as const;
