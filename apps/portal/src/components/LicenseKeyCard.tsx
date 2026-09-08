import { useState } from "react";

const FALLBACK_ACCENT = "#5C9CE6";

interface LicenseKeyCardProps {
  /** Robot display name, exactly as the app shows it. */
  robotName: string;
  /** The mentor's own description of the robot. Optional; omitted when blank. */
  description?: string | null;
  /** `expert_advisors.avatar_url`. May be a data URI. */
  artUrl?: string | null;
  /** `expert_advisors.accent_color`. */
  accentColor?: string | null;
  licenseKey: string;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const n = parseInt(raw, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Port of `Color.onArtFloor()` from the Android app (CLAUDE.md §4).
 *
 * A mentor may pick any accent they like, including a near-black one. Over the
 * scrim on this card that would render the label and the rim invisible, so an
 * accent below the luminance floor is lifted toward white until it clears it.
 * The mentor's hue survives; only the brightness is forced up.
 */
function onArtFloor(hex: string | null | undefined): string {
  const rgb = hexToRgb(hex ?? "") ?? hexToRgb(FALLBACK_ACCENT)!;
  const [r, g, b] = rgb;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  const FLOOR = 0.55;
  if (luminance >= FLOOR) return `rgb(${r}, ${g}, ${b})`;

  const lift = (FLOOR - luminance) / (1 - luminance);
  const mix = (c: number) => Math.round(c + (255 - c) * lift);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Channels for rgba() use, so the raw accent can still tint at low alpha. */
function accentChannels(hex: string | null | undefined): string {
  const [r, g, b] = hexToRgb(hex ?? "") ?? hexToRgb(FALLBACK_ACCENT)!;
  return `${r}, ${g}, ${b}`;
}

/** First letters of the first two words — the app's own no-art fallback. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "NH";
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * The artefact a mentor screenshots when they issue a licence.
 *
 * Which is why it holds nothing but the robot and the key: no buttons, no
 * hover states, no controls. Copy and Email live outside the card so they
 * cannot end up in the picture.
 *
 * It replaces a panel that showed a generic lucide robot glyph behind a
 * katakana rain canvas, over a strategy name and an accent colour both derived
 * by hashing the robot's name — invented metadata on the one screen whose
 * output goes to a paying customer. Everything here comes from the robot's own
 * row.
 */
export function LicenseKeyCard({
  robotName,
  description,
  artUrl,
  accentColor,
  licenseKey,
}: LicenseKeyCardProps) {
  const [artFailed, setArtFailed] = useState(false);
  const accent = onArtFloor(accentColor);
  const channels = accentChannels(accentColor);
  const hasArt = Boolean(artUrl) && !artFailed;

  return (
    <div
      className="relative isolate w-full overflow-hidden rounded-2xl"
      style={{ aspectRatio: "16 / 10", boxShadow: `0 20px 60px -20px rgba(${channels}, 0.35)` }}
    >
      {/* Art layer */}
      {hasArt ? (
        <img
          src={artUrl!}
          alt=""
          aria-hidden="true"
          onError={() => setArtFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `radial-gradient(120% 100% at 30% 0%, rgba(${channels}, 0.55), rgba(10, 10, 10, 1) 70%)`,
          }}
        >
          <span
            className="text-[6rem] font-bold leading-none tracking-tight"
            style={{ color: `rgba(${channels}, 0.28)` }}
          >
            {initials(robotName)}
          </span>
        </div>
      )}

      {/*
        Scrim. Mentor art is arbitrary — a bright chart screenshot is as likely
        as a dark render — so the text never sits directly on it.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 32%, rgba(0,0,0,0.35) 62%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Accent rim, drawn over everything so the art cannot bleed past it */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: `inset 0 0 0 1px rgba(${channels}, 0.45)` }}
      />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <img
            src="/novahost-mark.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 rounded-lg object-cover"
          />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            NovaHost licence
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
              {robotName}
            </h2>
            {description && (
              <p className="mt-1 line-clamp-1 text-sm text-white/60">{description}</p>
            )}
          </div>

          {/*
            Glass, and here it is earned: there is art directly behind it.
            Hand-rolled rather than the `.glass` utility because this panel is
            always over dark art in both themes, so it must not follow the
            viewer's light/dark tokens.
          */}
          <div
            className="rounded-xl px-4 py-3 backdrop-blur-md"
            style={{
              background: "rgba(255, 255, 255, 0.10)",
              border: `1px solid rgba(${channels}, 0.35)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: accent }}
            >
              Licence key
            </p>
            <code className="mt-1 block break-all font-mono text-lg font-semibold tracking-[0.12em] text-white sm:text-xl">
              {licenseKey}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
