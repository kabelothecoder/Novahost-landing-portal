import { Link } from "react-router-dom";
import { Wordmark } from "./Brand";
import { NAV } from "./Header";

const LEGAL = [
  ["Terms of Service", "/terms"],
  ["Privacy Policy", "/privacy"],
  ["Refund Policy", "/refunds"],
  ["Contact", "/contact"],
] as const;

/**
 * Nothing here points at the mentor portal or the admin console, and that is
 * deliberate rather than an oversight. Both live on their own unlisted
 * hostnames; people who belong there are given the link directly. This site
 * exists for one reader — somebody deciding whether to put a trading bot on
 * their phone — and every link on it serves that decision.
 */
export function Footer() {
  return (
    <footer className="border-t border-hairline px-6 py-12">
      <div className="mx-auto max-w-[1140px]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[34ch]">
            <Wordmark />
            <p className="mt-4 text-[13px] leading-relaxed text-ink-4">
              An Expert Advisor needs MetaTrader running on a computer. NovaHost runs it for you,
              so the bot trades from your phone instead.
            </p>
          </div>

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
          </div>
        </div>

        <div className="mt-10 border-t border-hairline pt-7">
          <p className="max-w-[70ch] text-[12px] leading-relaxed text-ink-5">
            Trading forex and CFDs carries a high risk of loss and is not suitable for everyone. An
            automated strategy can lose money as easily as it makes it, and past performance is not
            a reliable indicator of future results. NovaHost is software for hosting and running
            trading robots &mdash; it is not a broker or a financial services provider, it does not
            hold your funds, and nothing in it is financial advice.
          </p>
          <p className="mt-4 text-[13px] text-ink-5">
            &copy; {new Date().getFullYear()} NovaHost. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
