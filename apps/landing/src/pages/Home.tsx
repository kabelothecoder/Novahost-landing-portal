import {
  Apple,
  ArrowRight,
  BatteryCharging,
  Building2,
  CalendarClock,
  Check,
  Cpu,
  Fingerprint,
  Gauge,
  Layers,
  MonitorOff,
  ScanLine,
  Server,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  WifiOff,
  X,
} from "lucide-react";
import { Heading, Mark, SectionLabel, VISOR, VisorRule } from "@/components/Brand";
import { DownloadButtons } from "@/components/DownloadButtons";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Reveal } from "@/components/Reveal";
import { PRICES } from "@/lib/site";

// ─── Content ─────────────────────────────────────────────────────────────────

/**
 * The whole repositioning in one table.
 *
 * An Expert Advisor is a program that trades a MetaTrader account for you. The
 * catch has always been that it only runs while MetaTrader is open on a
 * computer, which is why serious users rent a VPS. That is the problem NovaHost
 * removes, and this is the clearest way to say so.
 */
const COMPARISON = [
  ["Somewhere to run it", "A PC left on, or a rented VPS", "Nothing. We run it for you"],
  ["What it costs to keep running", "Electricity, or ~$15 a month for a VPS", "R0 a month"],
  ["When your machine is off", "The bot stops trading", "The bot keeps trading"],
  ["Setting it up", "Install MetaTrader, attach the EA, tune it", "Enter a key, connect your broker"],
  ["Watching it", "Remote desktop into the VPS", "Open the app"],
] as const;

const STEPS = [
  {
    n: "01",
    title: "Get the app",
    body: "Android downloads the APK. iPhone installs straight from the web — no App Store, no TestFlight. One payment, in Rand, and it is yours for good.",
  },
  {
    n: "02",
    title: "Enter your licence key",
    body: "Your key is what tells NovaHost which robot to run for you. Type it in once; the app binds to your handset and you are done with setup screens.",
  },
  {
    n: "03",
    title: "Connect your broker",
    body: "Your own MT4 or MT5 account, at whichever broker you already use. Server, login, password. Your funds stay in your account and never move anywhere else.",
  },
  {
    n: "04",
    title: "Leave it running",
    body: "The robot trades your account from our servers, not from your handset. Close the app, lock the phone, let the battery die — it keeps going.",
  },
] as const;

const FEATURES = [
  {
    icon: MonitorOff,
    title: "No PC. No VPS.",
    body: "The one thing an Expert Advisor has always needed is a machine left switched on. NovaHost is that machine, so you do not have to own one or rent one.",
  },
  {
    icon: BatteryCharging,
    title: "Nothing runs on your phone",
    body: "Execution happens server-side. The app is where you watch and configure — it is not where the trading happens, so it costs you no battery and no data to keep a position open.",
  },
  {
    icon: Gauge,
    title: "Sized to your balance",
    body: "Lots are calculated against what is actually in your account and the risk you set, so the same robot trades a R5 000 account and a R500 000 one correctly.",
  },
  {
    icon: SlidersHorizontal,
    title: "Your limits, not the bot's",
    body: "Set risk per trade and how many positions may be open at once. A trade that would break your own rules never reaches your broker.",
  },
  {
    icon: Layers,
    title: "Only the symbols you allow",
    body: "Decide which instruments the robot may touch. Anything outside that list is refused, even when the robot asks for it.",
  },
  {
    icon: Building2,
    title: "Any MT4 or MT5 broker",
    body: "No approved broker list, no account to move, nothing to migrate. If your broker gives you MetaTrader credentials, NovaHost can use them.",
  },
  {
    icon: Fingerprint,
    title: "One licence, one phone",
    body: "Your key binds to your handset the first time you use it, so it cannot be passed around. Changing phones is a deliberate step rather than an accident.",
  },
  {
    icon: WifiOff,
    title: "Survives a dead signal",
    body: "Lose connectivity and the app keeps working on its last known good licence for several days, instead of locking you out at the worst possible moment.",
  },
] as const;

const SCANNER_POINTS = [
  "Screenshot any chart, from any platform",
  "Get an entry, a stop and a target — not a vibe",
  "Scored against the same risk rules your robot uses",
  "Refuses images that are not charts, instead of inventing a read",
] as const;

const PLANS = [
  {
    name: "App access",
    price: PRICES.app,
    tag: "Start here",
    featured: true,
    items: [
      "Lifetime access, Android or iPhone",
      "Your robot hosted and running 24/7",
      "Risk controls and smart lot sizing",
      "Any MT4 / MT5 broker",
    ],
  },
  {
    name: "AI chart scanner",
    price: PRICES.scanner,
    tag: "Add-on",
    featured: false,
    items: [
      "Scan any chart screenshot",
      "Entry, stop and target",
      "Scored against your guardrails",
      "Buy it whenever, or never",
    ],
  },
  {
    name: "Device move",
    price: PRICES.deviceMove,
    tag: "Only if you need it",
    featured: false,
    items: [
      "Move your licence to a new phone",
      "Keeps your existing key",
      "Only when you change handsets",
      "Not needed to get started",
    ],
  },
] as const;

const FAQ = [
  {
    q: "What is an Expert Advisor?",
    a: "A program that trades a MetaTrader account according to a fixed strategy — entries, stops and targets, without you pressing anything. Traders call them EAs, robots or bots. They are ordinary software, not a guarantee of profit.",
  },
  {
    q: "Do I need a computer?",
    a: "No, and that is the whole point. An EA normally only runs while MetaTrader is open on a PC, which is why people rent a VPS to keep one alive. NovaHost runs it instead, so all you need is the app and your broker login.",
  },
  {
    q: "Does it still trade when my phone is off?",
    a: "Yes. Orders are placed on our servers against your broker account, so the handset can be asleep, out of signal or flat. The app is a window onto what is happening, not the thing making it happen.",
  },
  {
    q: "Where does my licence key come from?",
    a: "From whoever supplied your robot. The key is what tells NovaHost which strategy to run on your account — without one the app has nothing to do, so get your key before you buy.",
  },
  {
    q: "Is my money safe?",
    a: "Your funds stay in your own broker account and NovaHost never holds, moves or withdraws them. It places trades, nothing else. That said, an EA can lose money — trade only what you can afford to lose.",
  },
  {
    q: "Is this a subscription?",
    a: "No. You pay once for the app, and once more only if you want the chart scanner. No monthly fee, and no billing token left sitting against your card afterwards.",
  },
  {
    q: "Which brokers work?",
    a: "Any broker that gives you MetaTrader 4 or MetaTrader 5 credentials. There is no approved list and nothing to switch to.",
  },
  {
    q: "I got a new phone. Now what?",
    a:
      "Your licence binds to one handset, so moving it is a paid step — R" +
      PRICES.deviceMove +
      ", which keeps your existing key and shifts it across. It exists to stop one key being shared around, not to charge you for upgrading.",
  },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
        <section className="relative overflow-hidden rounded-[26px] bg-surface sm:rounded-[32px]">
          {/* Magenta bloom one side, cyan the other — the visor's own two poles. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-30%] h-[820px] w-[1180px] -translate-x-1/2 rounded-full opacity-[0.30] blur-[120px]"
            style={{
              background: "radial-gradient(closest-side, #C2298F 0%, #6D28D9 42%, transparent 72%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[62%] top-[6%] h-[520px] w-[520px] rounded-full opacity-[0.24] blur-[110px]"
            style={{ background: "radial-gradient(closest-side, #22C9E8 0%, transparent 70%)" }}
          />
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

          <Header />

          <div className="relative z-10 px-6 pb-24 pt-14 sm:px-10 sm:pb-28 sm:pt-20">
            <div className="mx-auto max-w-[1140px]">
              <Reveal index={0}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2 backdrop-blur-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan" />
                  </span>
                  EA hosting &middot; Android &amp; iPhone
                </span>
              </Reveal>

              <Reveal index={1}>
                <h1
                  className="mt-7 max-w-[16ch] font-display text-[clamp(2.6rem,7vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.04em]"
                  style={{ textWrap: "balance" }}
                >
                  Your trading bot,{" "}
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: VISOR }}>
                    off the PC
                  </span>{" "}
                  and onto your phone.
                </h1>
              </Reveal>

              <Reveal index={2}>
                <p className="mt-7 max-w-[58ch] text-[clamp(1rem,1.7vw,1.19rem)] leading-relaxed text-ink-3">
                  An Expert Advisor only trades while MetaTrader is open on a computer. That is why
                  people leave a laptop running all night, or rent a VPS they never log into.
                  NovaHost hosts the robot instead &mdash; it trades your own broker account around
                  the clock, and you watch it from an app.
                </p>
              </Reveal>

              <Reveal index={3}>
                <div className="mt-10">
                  <DownloadButtons />
                </div>
              </Reveal>

              <Reveal index={4}>
                <p className="mt-5 text-[13.5px] text-ink-4">
                  Works with any MT4 or MT5 broker. You will need a licence key for the robot you
                  want to run.
                </p>
              </Reveal>

              {/* The three claims a sceptic checks first. */}
              <Reveal index={5}>
                <dl className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
                  {[
                    ["No PC", "and no VPS to rent"],
                    ["R0", "per month, forever"],
                    ["Your broker", "your funds, your credentials"],
                  ].map(([big, small]) => (
                    <div key={small} className="bg-[#0A0B13] px-6 py-7">
                      <dt className="font-display text-[26px] font-bold tracking-[-0.03em] text-ink">
                        {big}
                      </dt>
                      <dd className="mt-1.5 text-[13.5px] leading-relaxed text-ink-4">{small}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>
          </div>
        </section>
      </div>

      {/* ═══ WHAT IT IS ═════════════════════════════════════════════════════ */}
      <section id="what-it-is" className="scroll-mt-20 px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>01 &mdash; What NovaHost is</SectionLabel>
            <Heading className="max-w-[24ch]">A place for your robot to live.</Heading>
            <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-ink-3">
              NovaHost is a hosting platform for Expert Advisors. We keep the robot running and
              place its trades directly on your broker account from our servers &mdash; so the part
              that used to need a computer is the part you no longer own.
            </p>
          </Reveal>

          <Reveal index={1}>
            <div className="mt-12 overflow-x-auto rounded-2xl border border-edge bg-card">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="px-6 py-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
                      &nbsp;
                    </th>
                    <th className="px-6 py-5 font-display text-[15px] font-semibold text-ink-2">
                      <span className="inline-flex items-center gap-2">
                        <Cpu size={15} className="text-ink-4" />
                        Running it yourself
                      </span>
                    </th>
                    <th className="px-6 py-5 font-display text-[15px] font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <Server size={15} className="text-cyan" />
                        On NovaHost
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([label, before, after], i) => (
                    <tr key={label} className={i < COMPARISON.length - 1 ? "border-b border-hairline" : ""}>
                      <td className="px-6 py-4 text-[13.5px] font-medium text-ink-2">{label}</td>
                      <td className="px-6 py-4 text-[14px] text-ink-4">
                        <span className="inline-flex items-start gap-2">
                          <X size={14} className="mt-[3px] shrink-0 text-[#F0729E]" />
                          {before}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-ink-2">
                        <span className="inline-flex items-start gap-2">
                          <Check size={14} className="mt-[3px] shrink-0 text-[#37D399]" />
                          {after}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-hairline px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>02 &mdash; How it works</SectionLabel>
            <Heading className="max-w-[22ch]">Four steps, then you leave it alone.</Heading>
            <p className="mt-4 max-w-[54ch] text-[16px] leading-relaxed text-ink-3">
              Setup takes one sitting. After that the app is somewhere you check, not somewhere you
              have to be.
            </p>
          </Reveal>

          <ol className="mt-14 grid gap-5 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <Reveal
                key={s.n}
                index={i + 1}
                className="relative overflow-hidden rounded-2xl border border-edge bg-card p-8"
              >
                <VisorRule className="absolute inset-x-8 top-0" />
                <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-cyan">{s.n}</p>
                <h3 className="mt-4 font-display text-[21px] font-bold tracking-[-0.02em]">
                  {s.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-3">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══ THE APP — both platforms ═══════════════════════════════════════ */}
      <section id="the-app" className="scroll-mt-20 border-t border-hairline px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>03 &mdash; The app</SectionLabel>
            <Heading className="max-w-[22ch]">Built twice, properly.</Heading>
            <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-ink-3">
              Android and iPhone are different machines and we did not paper over it. Each build
              follows its own platform&rsquo;s conventions, and both talk to the same account.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <Reveal
              index={1}
              className="relative overflow-hidden rounded-2xl border border-edge bg-card p-8"
            >
              <VisorRule className="absolute inset-x-8 top-0" />
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#23262F] bg-hairline">
                <Smartphone size={19} className="text-cyan" />
              </span>
              <h3 className="mt-5 font-display text-[21px] font-bold tracking-[-0.02em]">Android</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">
                A native app, installed from a signed APK you download here. Material 3 throughout,
                with a floating overlay so you can keep an eye on a position without leaving
                whatever else you are doing.
              </p>
              <ul className="mt-6 space-y-2.5">
                {["Native Kotlin build", "Signed APK, direct download", "Floating position overlay"].map(
                  (t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                      <Check size={15} className="mt-[3px] shrink-0 text-cyan" />
                      <span>{t}</span>
                    </li>
                  ),
                )}
              </ul>
            </Reveal>

            <Reveal
              index={2}
              className="relative overflow-hidden rounded-2xl border border-edge bg-card p-8"
            >
              <VisorRule className="absolute inset-x-8 top-0" />
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#23262F] bg-hairline">
                <Apple size={19} className="text-cyan" />
              </span>
              <h3 className="mt-5 font-display text-[21px] font-bold tracking-[-0.02em]">iPhone</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">
                Installs straight from Safari to your home screen &mdash; no App Store queue, no
                TestFlight invite, no waiting on a review. Opens full screen with its own icon and
                behaves like any other app on the phone.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Add to Home Screen, done in seconds",
                  "Full screen, own icon, no browser bar",
                  "Updates arrive without a reinstall",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                    <Check size={15} className="mt-[3px] shrink-0 text-cyan" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* ─── What both builds carry ─── */}
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                index={(i % 4) + 1}
                className="rounded-2xl border border-edge bg-card p-6"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#23262F] bg-hairline">
                  <f.icon size={17} className="text-cyan" />
                </span>
                <h3 className="mt-5 font-display text-[16.5px] font-semibold tracking-[-0.015em]">
                  {f.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-3">{f.body}</p>
              </Reveal>
            ))}
          </div>

          <Reveal index={5}>
            <p className="mt-8 flex items-center gap-2 text-[13.5px] text-ink-4">
              <CalendarClock size={14} className="shrink-0 text-cyan" />
              Both builds carry the market wire and the week&rsquo;s economic calendar, so you know
              what is about to move before a position is open.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══ CHART SCANNER ══════════════════════════════════════════════════ */}
      <section className="border-t border-hairline px-6 py-24">
        <div className="mx-auto grid max-w-[1140px] items-center gap-14 lg:grid-cols-2">
          <Reveal index={0}>
            <SectionLabel>Optional add-on</SectionLabel>
            <Heading className="max-w-[18ch]">A second opinion on any chart.</Heading>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-3">
              Sometimes you want to take your own trade rather than the robot&rsquo;s. Screenshot
              the chart, hand it to the scanner, and get a structured read back &mdash; the levels,
              the reasoning, and an honest score against the risk rules you already set.
            </p>
            <ul className="mt-8 space-y-3.5">
              {SCANNER_POINTS.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[15px] text-ink-2">
                  <Check size={16} className="mt-[3px] shrink-0 text-cyan" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[13.5px] text-ink-4">
              Sold separately, once off. The app works fully without it.
            </p>
          </Reveal>

          <Reveal index={1}>
            <div className="relative overflow-hidden rounded-3xl border border-edge bg-card p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full opacity-[0.18] blur-[90px]"
                style={{ background: VISOR }}
              />
              <div className="relative">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#23262F] bg-hairline">
                  <ScanLine size={22} className="text-cyan" />
                </span>

                {/*
                  A sketch of the shape of the answer, not a screenshot: it stays
                  honest when the app's own UI moves on, and nothing here claims
                  to be a real trade.
                */}
                <div className="mt-7 space-y-2.5">
                  {[
                    ["Bias", "Long", "text-[#37D399]"],
                    ["Entry", "3 341.20", "text-ink"],
                    ["Stop", "3 328.60", "text-[#F0729E]"],
                    ["Target", "3 366.40", "text-[#37D399]"],
                  ].map(([label, value, tone]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-[#1B1E27] bg-[#0A0B12] px-4 py-3"
                    >
                      <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-4">
                        {label}
                      </span>
                      <span className={`font-mono text-[15px] font-bold tabular-nums ${tone}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-[#1B1E27] bg-[#0A0B12] px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-4">
                      Confluence
                    </span>
                    <span className="font-mono text-[13px] font-bold text-cyan">7 / 10</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full w-[70%] rounded-full" style={{ backgroundImage: VISOR }} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ PRICING ════════════════════════════════════════════════════════ */}
      <section id="pricing" className="scroll-mt-20 border-t border-hairline px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>04 &mdash; Pricing</SectionLabel>
            <Heading className="max-w-[20ch]">Pay once. No subscription.</Heading>
            <p className="mt-4 max-w-[54ch] text-[16px] leading-relaxed text-ink-3">
              One payment, in Rand, through PayFast. No monthly fee, no VPS bill, and no billing
              token left sitting against your card afterwards.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <Reveal
                key={p.name}
                index={i + 1}
                className="relative overflow-hidden rounded-2xl border bg-card p-7"
                style={{ borderColor: p.featured ? "#2E3442" : "#1D2029" }}
              >
                {p.featured && <VisorRule className="absolute inset-x-7 top-0" />}
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
                  {p.tag}
                </p>
                <h3 className="mt-3 font-display text-[20px] font-semibold tracking-[-0.015em]">
                  {p.name}
                </h3>
                <p className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-[17px] font-medium text-ink-3">R</span>
                  <span className="font-mono text-[42px] font-bold leading-none tracking-[-0.03em] tabular-nums">
                    {p.price}
                  </span>
                  <span className="ml-1 text-[14px] text-ink-4">once-off</span>
                </p>

                <ul className="mt-7 space-y-3">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-[14.5px] text-ink-3">
                      <Check size={15} className="mt-1 shrink-0 text-cyan" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>

          <Reveal index={4}>
            <p className="mt-8 text-[13.5px] text-ink-4">
              Prices include VAT where applicable. You buy the app once; the licence key for your
              robot comes from whoever supplied it.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══ FAQ ════════════════════════════════════════════════════════════ */}
      <section id="faq" className="scroll-mt-20 border-t border-hairline px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>05 &mdash; Questions</SectionLabel>
            <Heading className="max-w-[20ch]">The things people ask first.</Heading>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {FAQ.map((f, i) => (
              <Reveal
                key={f.q}
                index={(i % 2) + 1}
                className="rounded-2xl border border-edge bg-card p-7"
              >
                <h3 className="font-display text-[17px] font-semibold tracking-[-0.015em]">{f.q}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">{f.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CLOSING ════════════════════════════════════════════════════════ */}
      <section
        id="download"
        className="relative scroll-mt-20 overflow-hidden border-t border-hairline px-6 py-28"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.16] blur-[110px]"
          style={{ background: VISOR }}
        />
        <Reveal index={0} className="relative mx-auto max-w-[640px] text-center">
          <div className="mx-auto w-fit rounded-[26px] border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-sm">
            <Mark size={56} />
          </div>
          <Heading className="mt-7">Turn the laptop off.</Heading>
          <p className="mx-auto mt-4 max-w-[46ch] text-[16px] leading-relaxed text-ink-3">
            Install the app, enter your licence key, connect your broker. Your robot carries on
            without the machine it used to need.
          </p>
          <div className="mt-9 flex justify-center">
            <DownloadButtons />
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-[13px] text-ink-4">
            <ShieldCheck size={14} className="text-cyan" />
            Your broker credentials never leave your account
          </p>
          <a
            href="#what-it-is"
            className="group mt-8 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-4 transition-colors hover:text-ink-2"
          >
            Read how it works first
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
