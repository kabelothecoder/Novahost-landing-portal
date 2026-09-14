import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { VISOR, Wordmark } from "./Brand";

/** The numbered nav from the reference — the numbers encode the reading order. */
export const NAV = [
  ["01", "How it works", "#how-it-works"],
  ["02", "Features", "#features"],
  ["03", "Chart scanner", "#scanner"],
  ["04", "Pricing", "#pricing"],
  ["05", "Questions", "#faq"],
] as const;

/**
 * The site header.
 *
 * There is no Sign in and no Register here, and that is the point: this domain
 * markets the app to the people who use it. Mentors sign in on the portal's own
 * domain.
 */
export function Header() {
  const [open, setOpen] = useState(false);

  // A hash link with the sheet still open leaves the menu covering the section
  // it just scrolled to.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, [open]);

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Wordmark />

      <nav className="hidden items-center gap-7 lg:flex">
        {NAV.map(([n, label, href]) => (
          <a key={href} href={href} className="group flex items-baseline gap-1.5">
            <span className="font-mono text-[10.5px] font-bold text-[#5F6780] transition-colors group-hover:text-cyan">
              {n}
            </span>
            <span className="text-[14px] font-medium text-ink-2 transition-colors group-hover:text-white">
              {label}
            </span>
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <a
          href="#download"
          className="rounded-full px-4 py-2 text-[13.5px] font-semibold text-ground transition-transform hover:scale-[1.03]"
          style={{ backgroundImage: VISOR }}
        >
          Get the app
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-edge text-ink-2 transition-colors hover:text-white lg:hidden"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-4 top-[68px] rounded-2xl border border-edge bg-[#0C0E14] p-3 shadow-2xl lg:hidden">
          {NAV.map(([n, label, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-baseline gap-2.5 rounded-xl px-3.5 py-3 transition-colors hover:bg-white/[0.04]"
            >
              <span className="font-mono text-[10.5px] font-bold text-[#5F6780]">{n}</span>
              <span className="text-[15px] font-medium text-ink-2">{label}</span>
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
