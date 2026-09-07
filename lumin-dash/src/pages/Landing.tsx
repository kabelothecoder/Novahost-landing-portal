import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ScanLine,
  Radio,
  Layers,
  SlidersHorizontal,
  Building2,
  Fingerprint,
  ArrowRight,
  Check,
  Download,
  Apple,
  Users,
  Server,
  KeyRound,
  Gauge,
} from "lucide-react";

/**
 * Where the Android APK is served from.
 *
 * Defaults to the signed release build in the `downloads` bucket on the
 * NovaHost NovaHost backend. `VITE_APK_URL` overrides it (set in the Vercel
 * project) so the file can be moved without a code change. If both are somehow
 * empty the download control renders disabled rather than linking to "#" --
 * a button that looks live and silently does nothing is worse than one that
 * admits it is not ready.
 */
const APK_URL: string =
  import.meta.env.VITE_APK_URL ??
  "https://epulmnfbxjmaimefhofp.supabase.co/storage/v1/object/public/downloads/novahost.apk";

/**
 * The art direction, in one line: the product's own robot mark has a
 * magenta-to-cyan visor, so that gradient is the page's accent and everything
 * else is a deep indigo-black ground.
 *
 * The two poles of the visor also give the hero its warm/cool depth — magenta
 * bloom on one side, cyan on the other — rather than borrowing a third hue.
 *
 * The mark itself (`/novahost-mark.png`) is a render with a baked-in light
 * ground and no alpha, so it is always presented as a rounded app-icon tile.
 * Floating it on the dark ground would show its own grey square.
 */
const VISOR = "linear-gradient(100deg, #F0439E 0%, #A855F7 48%, #22C9E8 100%)";

const ease = [0.22, 1, 0.36, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease, delay: i * 0.08 },
  }),
};

// ─── Small building blocks ───────────────────────────────────────────────────

function Mark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/novahost-mark.png"
      alt=""
      width={size}
      height={size}
      className={`rounded-[22%] object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <Link to="/landing" className="flex items-center gap-2.5 select-none">
      <Mark size={size} />
      <span
        className="text-[16px] font-bold tracking-[-0.02em]"
        style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
      >
        NovaHost
      </span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7E869A]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </p>
  );
}

function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={`text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.03em] ${className}`}
      style={{ fontFamily: "'Bricolage Grotesque', sans-serif", textWrap: "balance" }}
    >
      {children}
    </h2>
  );
}

/** The numbered nav from the reference — the numbers encode the real reading order. */
const NAV = [
  ["01", "How it works", "#how-it-works"],
  ["02", "For mentors", "#for-mentors"],
  ["03", "Features", "#features"],
  ["04", "Pricing", "#pricing"],
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Landing() {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : {
        variants: rise,
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, margin: "-70px" },
      };

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#07070E] text-[#F2F4F8] antialiased"
      style={{ fontFamily: "'Figtree', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* ═══ HERO — inset in its own rounded container, as in the reference ═══ */}
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
        <section className="relative overflow-hidden rounded-[26px] bg-[#0B0B16] sm:rounded-[32px]">
          {/* Nebula: magenta bloom one side, cyan the other — the visor's own two poles. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-30%] h-[820px] w-[1180px] -translate-x-1/2 opacity-[0.30] blur-[120px]"
            style={{
              background:
                "radial-gradient(closest-side, #C2298F 0%, #6D28D9 42%, transparent 72%)",
              borderRadius: "50%",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[62%] top-[6%] h-[520px] w-[520px] opacity-[0.24] blur-[110px]"
            style={{
              background: "radial-gradient(closest-side, #22C9E8 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />
          {/* Faint grid, the way the reference grounds its cosmos. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(#FFF 1px, transparent 1px), linear-gradient(90deg, #FFF 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              maskImage: "radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%)",
            }}
          />

          {/* ─── Nav, inside the container ─── */}
          <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <Wordmark />

            <nav className="hidden items-center gap-7 lg:flex">
              {NAV.map(([n, label, href]) => (
                <a key={href} href={href} className="group flex items-baseline gap-1.5">
                  <span
                    className="text-[10.5px] font-bold text-[#5F6780] transition-colors group-hover:text-[#22C9E8]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {n}
                  </span>
                  <span className="text-[14px] font-medium text-[#A9B0BF] transition-colors group-hover:text-white">
                    {label}
                  </span>
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden rounded-full px-4 py-2 text-[14px] font-medium text-[#A9B0BF] transition-colors hover:text-white sm:block"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-full px-4 py-2 text-[13.5px] font-semibold text-[#07070E] transition-transform hover:scale-[1.03]"
                style={{ backgroundImage: VISOR }}
              >
                Host your robot
              </Link>
            </div>
          </header>

          {/* ─── Hero body ─── */}
          <div className="relative z-10 px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[1.05fr_0.9fr_1fr] lg:gap-8">
              {/* Left — the proposition */}
              <motion.div {...anim} custom={0} className="text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-[#C3C9D6] backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#22C9E8" }} />
                  Android now &middot; iOS coming soon
                </span>

                <h1
                  className="mt-6 text-[clamp(2.4rem,5.4vw,3.9rem)] font-bold leading-[1.02] tracking-[-0.035em]"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif", textWrap: "balance" }}
                >
                  Host your robot.
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: VISOR, WebkitBackgroundClip: "text" }}
                  >
                    Or follow one.
                  </span>
                </h1>
              </motion.div>

              {/* Centre — the mark as the glowing object, orbited */}
              <motion.div {...anim} custom={1} className="relative flex justify-center py-4">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 m-auto h-[260px] w-[260px] rounded-full opacity-50 blur-[60px]"
                  style={{ background: VISOR }}
                />
                {/* Orbit rings */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 m-auto h-[290px] w-[290px] rounded-full border border-white/[0.07]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 m-auto h-[225px] w-[225px] rounded-full border border-white/[0.10]"
                />
                <div className="relative rounded-[34px] border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
                  <Mark size={132} />
                </div>
              </motion.div>

              {/* Right — what it actually does, and the two doors */}
              <motion.div {...anim} custom={2} className="text-center lg:text-left">
                <p className="mx-auto max-w-[42ch] text-[15.5px] leading-relaxed text-[#A6ADBC] lg:mx-0">
                  NovaHost hosts a mentor&rsquo;s trading robot and copies every call it makes onto
                  their subscribers&rsquo; own MT4 or MT5 accounts &mdash; each one sized to that
                  trader&rsquo;s balance, inside the risk limits they set themselves.
                </p>

                <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  {APK_URL ? (
                    <a
                      href={APK_URL}
                      className="inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[14.5px] font-semibold text-[#07070E] transition-transform duration-200 hover:scale-[1.02]"
                      style={{ backgroundImage: VISOR }}
                    >
                      <Download size={16} />
                      Get the app
                    </a>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex cursor-not-allowed select-none items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.05] px-6 py-3.5 text-[14.5px] font-semibold text-[#767E90]"
                    >
                      <Download size={16} />
                      Android coming shortly
                    </span>
                  )}
                  <a
                    href="#for-mentors"
                    className="group inline-flex items-center gap-2 rounded-full border border-white/12 px-6 py-3.5 text-[14.5px] font-semibold text-[#E7EAF1] transition-colors hover:border-white/25"
                  >
                    I&rsquo;m a mentor
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </motion.div>
            </div>

            {/* ─── Stat strip. Every figure here is checkable — no invented traction. ─── */}
            <motion.div
              {...anim}
              custom={3}
              className="mx-auto mt-14 grid max-w-[1180px] grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3"
            >
              {[
                ["MT4 + MT5", "Works with the broker you already use."],
                ["R599", "Once-off. There is no subscription."],
                ["0%", "Commission taken on your trades."],
              ].map(([big, small]) => (
                <div key={big} className="bg-[#0B0B16] px-6 py-6">
                  <p
                    className="text-[26px] font-bold leading-none tracking-[-0.02em]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {big}
                  </p>
                  <p className="mt-2.5 text-[13.5px] text-[#8B92A3]">{small}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      </div>

      {/* ═══ THE TWO SIDES ═══════════════════════════════════════════════════ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <motion.div {...anim} custom={0} className="text-center">
            <SectionLabel>One platform, two sides</SectionLabel>
            <Heading className="mx-auto max-w-[22ch]">
              A robot lives here. Its subscribers trade it.
            </Heading>
            <p className="mx-auto mt-5 max-w-[58ch] text-[16px] leading-relaxed text-[#8B92A3]">
              A mentor hosts one robot. Anyone holding a key to that robot receives its trades on
              their own broker account. Neither side ever touches the other&rsquo;s money.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {/* Traders */}
            <motion.div
              {...anim}
              custom={1}
              className="relative overflow-hidden rounded-2xl border border-[#1D2029] bg-[#0C0E14] p-8"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px"
                style={{ backgroundImage: VISOR }}
              />
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#23262F] bg-[#14171E]">
                <Users size={18} className="text-[#F0439E]" />
              </span>
              <p
                className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6C7484]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                If you trade
              </p>
              <h3
                className="mt-2.5 text-[24px] font-bold tracking-[-0.02em]"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Follow a hosted robot
              </h3>
              <p className="mt-3.5 text-[15px] leading-relaxed text-[#98A0B0]">
                Buy the app, enter the key your mentor gave you, and link your own MT4 or MT5
                account. From then on their robot&rsquo;s trades arrive on your account
                automatically &mdash; and you still decide the size and the limits.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Trades copied to your own broker account",
                  "Lot size scaled to your balance, not theirs",
                  "Your own per-symbol limits and guardrails",
                  "AI chart scanner for your own setups",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14.5px] text-[#A6ADBC]">
                    <Check size={15} className="mt-1 shrink-0 text-[#22C9E8]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Mentors */}
            <motion.div
              {...anim}
              custom={2}
              id="for-mentors"
              className="relative overflow-hidden rounded-2xl border border-[#1D2029] bg-[#0C0E14] p-8 scroll-mt-24"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px"
                style={{ backgroundImage: VISOR }}
              />
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#23262F] bg-[#14171E]">
                <Server size={18} className="text-[#22C9E8]" />
              </span>
              <p
                className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6C7484]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                If you teach
              </p>
              <h3
                className="mt-2.5 text-[24px] font-bold tracking-[-0.02em]"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Host your robot here
              </h3>
              <p className="mt-3.5 text-[15px] leading-relaxed text-[#98A0B0]">
                Put your robot on NovaHost, issue licence keys to your students, and send a trade
                once &mdash; it reaches every subscriber who is online. You never hold their
                credentials and never touch their funds.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Host one robot, issue keys to your students",
                  "Send market, limit and stop orders from the portal",
                  "See which handsets actually received each call",
                  "Set the symbols your robot is allowed to trade",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14.5px] text-[#A6ADBC]">
                    <Check size={15} className="mt-1 shrink-0 text-[#22C9E8]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="group mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-[#07070E] transition-transform hover:scale-[1.02]"
                style={{ backgroundImage: VISOR }}
              >
                Start hosting
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-[#14171E] px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <motion.div {...anim} custom={0}>
            <SectionLabel>01 &mdash; How it works</SectionLabel>
            <Heading className="max-w-[20ch]">From your mentor&rsquo;s screen to your broker.</Heading>
          </motion.div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                icon: Server,
                t: "The robot is hosted",
                d: "A mentor registers their robot on NovaHost and chooses which symbols it may trade.",
              },
              {
                n: "02",
                icon: KeyRound,
                t: "You get a key",
                d: "They issue you a licence key. It binds to one handset, so a key cannot be shared around.",
              },
              {
                n: "03",
                icon: Building2,
                t: "You link your broker",
                d: "Your MT4 or MT5 server, login and password. Your account stays yours — we never hold funds.",
              },
              {
                n: "04",
                icon: Gauge,
                t: "Trades arrive",
                d: "Every call the robot makes lands on your account, sized to your balance and your limits.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                {...anim}
                custom={i + 1}
                className="rounded-2xl border border-[#1D2029] bg-[#0C0E14] p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#23262F] bg-[#14171E]">
                    <s.icon size={16} className="text-[#22C9E8]" />
                  </span>
                  <span
                    className="text-[12px] font-bold text-[#3F4658]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {s.n}
                  </span>
                </div>
                <h3
                  className="mt-5 text-[17.5px] font-semibold tracking-[-0.015em]"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {s.t}
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#8B92A3]">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ════════════════════════════════════════════════════════ */}
      <section id="features" className="scroll-mt-20 border-t border-[#14171E] px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <motion.div {...anim} custom={0}>
            <SectionLabel>03 &mdash; What else you get</SectionLabel>
            <Heading className="max-w-[24ch]">
              Copying the trade is the start, not the whole product.
            </Heading>
          </motion.div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ScanLine,
                t: "AI chart scanner",
                d: "Screenshot any chart and get a structured read — direction, entry, stop and target — scored against the guardrails you set.",
              },
              {
                icon: Radio,
                t: "Market and pending orders",
                d: "Your mentor can send a market fill or leave a limit or stop waiting at a level, with an expiry.",
              },
              {
                icon: Layers,
                t: "Floating overlay",
                d: "A small bubble that floats over any app, so you can watch your robot without leaving what you were doing.",
              },
              {
                icon: SlidersHorizontal,
                t: "Your risk, your rules",
                d: "Per-symbol lot size, max open trades and hard guardrails that will refuse a trade rather than break your limits.",
              },
              {
                icon: Building2,
                t: "Any MT4 or MT5 broker",
                d: "No broker is hardcoded, and the robot adapts to whatever your broker happens to call each symbol.",
              },
              {
                icon: Fingerprint,
                t: "One device, one licence",
                d: "Every key is bound to your handset. Changed phones? Move it across yourself, no support ticket.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.t}
                {...anim}
                custom={i * 0.5}
                className="rounded-2xl border border-[#1D2029] bg-[#0C0E14] p-7 transition-colors hover:border-[#2B303C]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#23262F] bg-[#14171E]">
                  <f.icon size={18} className="text-[#22C9E8]" />
                </span>
                <h3
                  className="mt-5 text-[17.5px] font-semibold tracking-[-0.015em]"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {f.t}
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#8B92A3]">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═════════════════════════════════════════════════════════ */}
      <section id="pricing" className="scroll-mt-20 border-t border-[#14171E] px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <motion.div {...anim} custom={0}>
            <SectionLabel>04 &mdash; Pricing</SectionLabel>
            <Heading className="max-w-[20ch]">Pay once. No subscription.</Heading>
            <p className="mt-4 max-w-[54ch] text-[16px] leading-relaxed text-[#8B92A3]">
              One payment, in Rands, through PayFast. No monthly fee, and no billing token left
              sitting against your card afterwards. Hosting a robot as a mentor is separate &mdash;
              talk to us.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                name: "App access",
                price: "599",
                tag: "Start here",
                featured: true,
                items: [
                  "Lifetime access to the app",
                  "Trades from your mentor's robot",
                  "Floating overlay + risk controls",
                  "Any MT4 / MT5 broker",
                ],
              },
              {
                name: "AI chart scanner",
                price: "349",
                tag: "Add-on",
                featured: false,
                items: [
                  "Scan any chart screenshot",
                  "Entry, stop and target",
                  "Scored against your guardrails",
                  "Refuses non-chart images",
                ],
              },
              {
                name: "Device move",
                price: "150",
                tag: "When you need it",
                featured: false,
                items: [
                  "Move your licence to a new phone",
                  "Keeps your existing key",
                  "Only if you change handsets",
                  "Not needed to get started",
                ],
              },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                {...anim}
                custom={i + 1}
                className="relative overflow-hidden rounded-2xl border bg-[#0C0E14] p-7"
                style={{ borderColor: p.featured ? "#2E3442" : "#1D2029" }}
              >
                {p.featured && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-7 top-0 h-px"
                    style={{ backgroundImage: VISOR }}
                  />
                )}
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6C7484]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {p.tag}
                </p>
                <h3
                  className="mt-3 text-[20px] font-semibold tracking-[-0.015em]"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {p.name}
                </h3>
                <p className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-[17px] font-medium text-[#8B92A3]">R</span>
                  <span
                    className="text-[42px] font-bold leading-none tracking-[-0.03em]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {p.price}
                  </span>
                  <span className="ml-1 text-[14px] text-[#6C7484]">once-off</span>
                </p>

                <ul className="mt-7 space-y-3">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-[14.5px] text-[#98A0B0]">
                      <Check size={15} className="mt-1 shrink-0 text-[#22C9E8]" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.p {...anim} custom={4} className="mt-8 text-[13.5px] text-[#6C7484]">
            Prices include VAT where applicable. You buy the app once; your mentor issues the
            licence key that ties it to their robot.
          </motion.p>
        </div>
      </section>

      {/* ═══ CLOSING ═════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-[#14171E] px-6 py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[820px] -translate-x-1/2 -translate-y-1/2 opacity-[0.16] blur-[110px]"
          style={{ background: VISOR, borderRadius: "50%" }}
        />
        <motion.div {...anim} custom={0} className="relative mx-auto max-w-[640px] text-center">
          <div className="mx-auto w-fit rounded-[26px] border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-sm">
            <Mark size={56} />
          </div>
          <Heading className="mt-7">Pick your side.</Heading>
          <p className="mx-auto mt-5 max-w-[48ch] text-[16.5px] leading-relaxed text-[#98A0B0]">
            Get the app and follow your mentor&rsquo;s robot, or host your own and let your
            students trade it.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {APK_URL ? (
              <a
                href={APK_URL}
                className="inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[15px] font-semibold text-[#07070E] transition-transform duration-200 hover:scale-[1.02]"
                style={{ backgroundImage: VISOR }}
              >
                <Download size={17} />
                Get the app
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex cursor-not-allowed select-none items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.05] px-7 py-3.5 text-[15px] font-semibold text-[#767E90]"
              >
                <Download size={17} />
                Android coming shortly
              </span>
            )}
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-full border border-white/12 px-6 py-3.5 text-[15px] font-semibold text-[#E7EAF1] transition-colors hover:border-white/25"
            >
              Host your robot
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <p className="mt-7 inline-flex items-center gap-2 text-[13.5px] text-[#6C7484]">
            <Apple size={14} />
            iOS is coming soon &mdash; Android is available first.
          </p>
        </motion.div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#14171E] px-6 py-12">
        <div className="mx-auto max-w-[1140px]">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <Wordmark />

            <div className="flex flex-wrap gap-x-14 gap-y-8">
              <nav className="flex flex-col gap-3">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4E5568]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Product
                </p>
                {NAV.map(([, label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="text-[13.5px] text-[#6C7484] transition-colors hover:text-[#A9B0BF]"
                  >
                    {label}
                  </a>
                ))}
              </nav>

              <nav className="flex flex-col gap-3">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4E5568]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Legal
                </p>
                {[
                  ["Terms of Service", "/terms"],
                  ["Privacy Policy", "/privacy"],
                  ["Refund Policy", "/refunds"],
                  ["Contact", "/contact"],
                ].map(([label, to]) => (
                  <Link
                    key={to}
                    to={to}
                    className="text-[13.5px] text-[#6C7484] transition-colors hover:text-[#A9B0BF]"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="mt-10 border-t border-[#14171E] pt-7">
            <p className="max-w-[70ch] text-[12px] leading-relaxed text-[#5B6272]">
              Trading forex and CFDs carries a high risk of loss and is not suitable for everyone.
              NovaHost is software for hosting and copying trades &mdash; it is not a broker or a
              financial services provider, and nothing in it is financial advice. Past performance is
              not a reliable indicator of future results.
            </p>
            <p className="mt-4 text-[13px] text-[#5B6272]">
              &copy; {new Date().getFullYear()} NovaHost. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
