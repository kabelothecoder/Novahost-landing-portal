import { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";

interface RobotArtPreviewProps {
  /** Image URL as entered/uploaded by the mentor. */
  imageUrl?: string;
  /** The robot's accent colour, e.g. "#C9A227". */
  accentColor?: string;
  /** Robot display name, shown over the scrim exactly as the app shows it. */
  displayName?: string;
  /** Mentor handle rendered under the name on the deck. */
  handle?: string;
}

const FALLBACK_ACCENT = "#5C9CE6";

/** Hex -> "r, g, b" for use in rgba(). Falls back to the Nova blue. */
function rgbChannels(hex?: string): string {
  const raw = (hex ?? "").trim().replace("#", "");
  const valid = /^[0-9a-fA-F]{6}$/.test(raw) ? raw : FALLBACK_ACCENT.replace("#", "");
  const n = parseInt(valid, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** First letters of the first two words — the app's no-art fallback. */
function initials(name?: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "NE";
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

/**
 * Renders a mentor's uploaded art exactly as the Android app will: fixed crop,
 * accent tint, bottom scrim, accent rim, plus the circular list avatar.
 *
 * The previous preview was a bare <img> at a different aspect ratio with none
 * of the treatment, so a mentor could not tell that the scrim would swallow
 * text along the bottom of their image, or that a clashing palette would be
 * pulled toward their accent. They only found out on a buyer's phone.
 */
export function RobotArtPreview({
  imageUrl,
  accentColor,
  displayName,
  handle,
}: RobotArtPreviewProps) {
  const [broken, setBroken] = useState(false);
  const rgb = useMemo(() => rgbChannels(accentColor), [accentColor]);
  const hasArt = Boolean(imageUrl?.trim()) && !broken;

  const rim = `0 0 0 1.5px rgba(${rgb}, 0.70), 0 0 26px rgba(${rgb}, 0.28), inset 0 0 32px rgba(${rgb}, 0.10)`;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        {/* ── Hero, as rendered on the home deck ── */}
        <div className="relative w-[150px] shrink-0">
          <div
            className="relative overflow-hidden rounded-[20px] bg-[#0C0C13]"
            style={{ aspectRatio: "1 / 1.06", boxShadow: rim }}
          >
            {hasArt ? (
              <>
                <img
                  src={imageUrl}
                  alt=""
                  onError={() => setBroken(true)}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: "center 30%" }}
                />
                {/* accent blend — unifies any palette with the dark deck */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: `rgb(${rgb})`,
                    mixBlendMode: "color",
                    opacity: 0.3,
                  }}
                />
              </>
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `radial-gradient(60% 45% at 50% 34%, rgba(${rgb},0.16), transparent 70%)`,
                }}
              >
                <span
                  className="text-[34px] font-bold"
                  style={{ color: `rgba(${rgb},0.85)`, textShadow: `0 0 22px rgba(${rgb},0.6)` }}
                >
                  {initials(displayName)}
                </span>
              </div>
            )}

            {/* mandatory bottom scrim — keeps the name legible over any image */}
            <div
              className="absolute inset-x-0 bottom-0 h-[48%]"
              style={{ background: "linear-gradient(180deg, transparent, rgba(7,7,11,0.95))" }}
            />

            <div className="absolute inset-x-0 bottom-2 text-center">
              <div className="truncate px-2 text-[11px] font-bold tracking-wide text-white">
                {displayName?.trim() || "ROBOT NAME"}
              </div>
              {handle?.trim() && (
                <div className="truncate px-2 text-[7px] tracking-[0.12em] text-white/45">
                  ~ {handle.trim()}
                </div>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-center text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            Home deck
          </p>
        </div>

        {/* ── Circular list avatar, cropped from the same asset ── */}
        <div className="shrink-0">
          <div
            className="relative h-[52px] w-[52px] overflow-hidden rounded-full bg-[#0C0C13]"
            style={{ boxShadow: `0 0 0 1.5px rgba(${rgb},0.7), 0 0 12px rgba(${rgb},0.5)` }}
          >
            {hasArt ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[16px] font-bold"
                style={{ color: `rgba(${rgb},0.85)` }}
              >
                {initials(displayName)}
              </div>
            )}
          </div>
          <p className="mt-1.5 text-center text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            List
          </p>
        </div>

        {/* ── What the mentor needs to know ── */}
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          {broken && (
            <p className="flex items-start gap-1.5 text-[11px] text-red-400">
              <ImageOff className="mt-0.5 h-3 w-3 shrink-0" />
              That image could not be loaded. Buyers will see the initials fallback.
            </p>
          )}
          <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
            <li>Cropped square-ish and anchored near the top — faces and logos survive.</li>
            <li>Tinted 30% toward your accent so it suits the dark deck.</li>
            <li>
              The lower third fades to black.{" "}
              <span className="text-white/70">Text along the bottom of your image will be lost.</span>
            </li>
            <li>Use at least 800 × 850px, under 2MB.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RobotArtPreview;
