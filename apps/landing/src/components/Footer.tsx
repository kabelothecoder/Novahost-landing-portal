import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PORTAL_URL } from "@/lib/site";
import { Wordmark } from "./Brand";
import { NAV } from "./Header";

const LEGAL = [
  ["Terms of Service", "/terms"],
  ["Privacy Policy", "/privacy"],
  ["Refund Policy", "/refunds"],
  ["Contact", "/contact"],
] as const;

export function Footer() {
  return (
    <footer className="border-t border-hairline px-6 py-12">
      <div className="mx-auto max-w-[1140px]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <Wordmark />

          <div className="flex flex-wrap gap-x-14 gap-y-8">
            <nav className="flex flex-col gap-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4E5568]">
                Product
              </p>
              {NAV.map(([, label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="text-[13.5px] text-ink-4 transition-colors hover:text-ink-2"
                >
                  {label}
                </a>
              ))}
            </nav>

            <nav className="flex flex-col gap-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4E5568]">
                Legal
              </p>
              {LEGAL.map(([label, to]) => (
                <Link
                  key={to}
                  to={to}
                  className="text-[13.5px] text-ink-4 transition-colors hover:text-ink-2"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/*
              The one mentor-facing element on the whole site, and only when the
              operator has set VITE_PORTAL_URL. It is a link to another domain,
              not a signup: mentors register and sign in over there.
            */}
            {PORTAL_URL && (
              <nav className="flex flex-col gap-3">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4E5568]">
                  Mentors
                </p>
                <a
                  href={PORTAL_URL}
                  className="group inline-flex items-center gap-1 text-[13.5px] text-ink-4 transition-colors hover:text-ink-2"
                >
                  Mentor portal
                  <ArrowUpRight
                    size={13}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              </nav>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-hairline pt-7">
          <p className="max-w-[70ch] text-[12px] leading-relaxed text-ink-5">
            Trading forex and CFDs carries a high risk of loss and is not suitable for everyone.
            NovaHost is software for hosting and copying trades &mdash; it is not a broker or a
            financial services provider, and nothing in it is financial advice. Past performance is
            not a reliable indicator of future results.
          </p>
          <p className="mt-4 text-[13px] text-ink-5">
            &copy; {new Date().getFullYear()} NovaHost. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
