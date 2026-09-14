/**
 * NovaHost MARKETING brand tokens.
 *
 * Scope: the marketing site (apps/landing) and the licence-key / auth emails.
 *
 * NOT the portal's functional UI and NOT the admin console — both of those use
 * a deliberately separate neutral dual-theme system (apps/portal/src/index.css,
 * mirrored in apps/admin) and must not be pulled toward this gradient. A
 * console is for reading numbers off; a saturated ground makes a red figure
 * harder to tell from a green one.
 *
 * Source of truth: the shipped licence-key email
 * (apps/portal/supabase/functions/send-license-email). apps/landing mirrors
 * these into Tailwind colours in its own tailwind.config.ts — change both, or
 * neither.
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
