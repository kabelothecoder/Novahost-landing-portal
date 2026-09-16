import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The commission score: how many qualifying keys, out of how many are needed.
 *
 * A ring rather than a bar because the number in the middle is the thing being
 * read -- the arc is context for it, not the other way round. It is drawn with
 * a stroke-dasharray rather than an animated width so it stays crisp at any
 * size and needs no layout work to animate.
 *
 * Colour is semantic, per the portal's rules: the accent while the target is
 * still ahead, green once it is met. Nothing is coloured for decoration.
 */
export function ScoreRing({
  value,
  target,
  label,
  caption,
  size = 168,
  stroke = 12,
  className,
}: {
  value: number;
  target: number;
  label?: string;
  caption?: string;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const safeTarget = Math.max(1, target);
  const pct = Math.max(0, Math.min(1, value / safeTarget));
  const met = value >= target;

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate from empty on first paint so the ring reads as a measurement being
  // taken rather than a static graphic -- but only once, and never for somebody
  // who has asked the OS for reduced motion.
  const [drawn, setDrawn] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      setDrawn(pct);
      return;
    }
    started.current = true;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDrawn(pct);
      return;
    }
    const id = window.setTimeout(() => setDrawn(pct), 60);
    return () => window.clearTimeout(id);
  }, [pct]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${value} of ${target} qualifying keys`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={met ? "hsl(var(--success))" : "hsl(var(--primary))"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - drawn)}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[34px] font-bold leading-none tabular-nums tracking-tight">
            {value}
            <span className="text-[18px] font-semibold text-muted-foreground">/{target}</span>
          </p>
          {label && (
            <p className="mt-1.5 max-w-[10ch] text-center text-[11px] font-medium leading-tight text-muted-foreground">
              {label}
            </p>
          )}
        </div>
      </div>

      {caption && (
        <p className="mt-3 max-w-[30ch] text-center text-[12.5px] text-muted-foreground">{caption}</p>
      )}
    </div>
  );
}

/**
 * A slim version of the same idea for a row in a list: no centre number, just
 * the arc, next to whatever is naming it.
 */
export function MiniRing({
  value,
  target,
  size = 34,
  stroke = 4,
}: {
  value: number;
  target: number;
  size?: number;
  stroke?: number;
}) {
  const safeTarget = Math.max(1, target);
  const pct = Math.max(0, Math.min(1, value / safeTarget));
  const met = value >= target;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={met ? "hsl(var(--success))" : "hsl(var(--primary))"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
      />
    </svg>
  );
}
