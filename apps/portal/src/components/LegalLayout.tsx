import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Shared shell for the four published policy pages (Terms, Privacy, Refunds,
 * Contact). Same ground, type and accent as the landing page so a visitor who
 * clicks through from the footer does not feel like they left the site — which
 * matters when the thing on the other side of these links is a payment.
 *
 * Pages pass plain semantic HTML as children; the arbitrary-variant classes on
 * the wrapper style it, so the page files stay readable prose.
 */

const VISOR = "linear-gradient(100deg, #F0439E 0%, #A855F7 48%, #22C9E8 100%)";

/** One place to change the operator's legal details. Referenced by Terms,
 *  Privacy and Contact. Confirm every value before launch. */
export const COMPANY = {
  /** Trading/brand name shown to customers. */
  name: "NovaHost",
  /** Registered legal name. If trading as a sole proprietor, this is the
   *  individual's full name. */
  legalName: "NovaHost (Pty) Ltd", // TODO: confirm — company, or "<Full Name> t/a NovaHost"
  /** Company / CK registration number, or "" if a sole proprietorship. */
  registration: "", // TODO: confirm
  /** Physical address — required for e-commerce under ECT Act s43. City +
   *  province is the minimum. */
  address: "South Africa", // TODO: confirm street / city / province
  /** Monitored support inbox. */
  email: "kabelomzwakhe@gmail.com",
  /** Governing law. */
  jurisdiction: "the Republic of South Africa",
} as const;

export const LAST_UPDATED = "3 September 2026";

const LEGAL_LINKS = [
  ["Terms of Service", "/terms"],
  ["Privacy Policy", "/privacy"],
  ["Refund Policy", "/refunds"],
  ["Contact", "/contact"],
] as const;

export default function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#07070E] text-[#F2F4F8] antialiased"
      style={{ fontFamily: "'Figtree', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* ─── Top bar ─── */}
      <header className="border-b border-[#14171E] px-6 py-5">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-4">
          <Link to="/landing" className="flex items-center gap-2.5 select-none">
            <img
              src="/novahost-mark.png"
              alt=""
              width={28}
              height={28}
              className="rounded-[22%] object-cover"
              style={{ width: 28, height: 28 }}
            />
            <span
              className="text-[15px] font-bold tracking-[-0.02em]"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              NovaHost
            </span>
          </Link>
          <Link
            to="/landing"
            className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#8B92A3] transition-colors hover:text-white"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Back to site
          </Link>
        </div>
      </header>

      {/* ─── Body ─── */}
      <main className="px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-[720px]">
          <span
            aria-hidden="true"
            className="mb-6 block h-px w-16"
            style={{ backgroundImage: VISOR }}
          />
          <h1
            className="text-[clamp(1.9rem,4.4vw,2.6rem)] font-bold leading-[1.1] tracking-[-0.03em]"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", textWrap: "balance" }}
          >
            {title}
          </h1>
          <p
            className="mt-3 text-[12.5px] uppercase tracking-[0.14em] text-[#6C7484]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Last updated {LAST_UPDATED}
          </p>

          {intro && (
            <div className="mt-7 text-[15.5px] leading-relaxed text-[#A6ADBC]">{intro}</div>
          )}

          {/* Prose. Arbitrary variants keep the page files as plain HTML. */}
          <div
            className="
              mt-10 text-[15px] leading-[1.75] text-[#98A0B0]
              [&_h2]:mt-11 [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&_h2]:text-[#F2F4F8]
              [&_h2]:font-[family-name:'Bricolage_Grotesque',sans-serif]
              [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:text-[15.5px] [&_h3]:font-semibold [&_h3]:text-[#E7EAF1]
              [&_p]:mt-4
              [&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:marker:text-[#3F4658]
              [&_a]:text-[#22C9E8] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#5FD8F0]
              [&_strong]:font-semibold [&_strong]:text-[#D3D8E2]
              [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px]
              [&_code]:font-[family-name:'JetBrains_Mono',monospace]
            "
          >
            {children}
          </div>

          {/* ─── Cross-links ─── */}
          <nav className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#14171E] pt-8">
            {LEGAL_LINKS.map(([label, href]) => (
              <Link
                key={href}
                to={href}
                className="text-[13.5px] text-[#6C7484] transition-colors hover:text-[#A9B0BF]"
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 text-[13px] text-[#5B6272]">
            &copy; {new Date().getFullYear()} {COMPANY.name}. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
