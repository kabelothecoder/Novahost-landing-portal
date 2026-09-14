import { Link } from "react-router-dom";

/**
 * The art direction in one line: the robot mark's visor runs magenta → violet
 * → cyan, so that gradient is the site's only accent and everything else is a
 * deep indigo-black ground.
 */
export const VISOR = "linear-gradient(100deg, #F0439E 0%, #A855F7 48%, #22C9E8 100%)";

/**
 * The mark is a render with a baked-in light ground and no alpha, so it is
 * always presented as a rounded app-icon tile. Floated bare on the dark ground
 * it shows its own grey square.
 */
export function Mark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/novahost-mark.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-[22%] object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <Link to="/" className="flex select-none items-center gap-2.5">
      <Mark size={size} />
      <span className="font-display text-[16px] font-bold tracking-[-0.02em]">NovaHost</span>
    </Link>
  );
}

/** Small uppercase mono label that opens a section. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7E869A]">
      {children}
    </p>
  );
}

export function Heading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.03em] ${className}`}
      style={{ textWrap: "balance" }}
    >
      {children}
    </h2>
  );
}

/** A 1px rule in the brand gradient, used to top-light a card. */
export function VisorRule({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`h-px ${className}`} style={{ backgroundImage: VISOR }} />;
}
