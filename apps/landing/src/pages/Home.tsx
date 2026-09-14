import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  Fingerprint,
  Gauge,
  Layers,
  Radio,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  WifiOff,
} from "lucide-react";
import { Heading, Mark, SectionLabel, VISOR, VisorRule } from "@/components/Brand";
import { DownloadButtons } from "@/components/DownloadButtons";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Reveal } from "@/components/Reveal";
import { PRICES } from "@/lib/site";

// ─── Content ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Install the app",
    body: "iPhone installs it straight from the web — no App Store, no TestFlight. Android downloads the APK. One payment, in Rand, and the app is yours for good.",
  },
  {
    n: "02",
    title: "Enter your mentor's key",
    body: "Your mentor issues you a licence key. Typing it in is what ties your phone to their robot, and it is the only thing that does — there is no account to hunt for.",
  },
  {
    n: "03",
    title: "Connect your broker",
    body: "Your own MT4 or MT5 account, at whichever broker you already use. Server, login, password. Your funds never leave your account and your mentor never sees the credentials.",
  },
  {
    n: "04",
    title: "Stop watching charts",
    body: "When your mentor sends a call it is executed against your account on our servers — not on your handset. It lands whether the phone is asleep, in your pocket, or flat.",
  },
] as const;

const FEATURES = [
  {
    icon: Radio,
    title: "Trades land without you",
    body: "Execution happens server-side. You do not have to have the app open, the screen on, or the phone charged for a call to reach your broker.",
  },
  {
    icon: Gauge,
    title: "Sized to your balance",
    body: "The lot is calculated against what is actually in your account and the risk you set — not copied blindly from a mentor trading a different number.",
  },
  {
    icon: SlidersHorizontal,
    title: "Your guardrails hold",
    body: "Set the risk per trade and how many positions may be open at once. A call that would break your own rules does not get through.",
  },
  {
    icon: Layers,
    title: "Only the symbols you allow",
    body: "Decide which instruments the robot may touch. Anything outside that list is refused, even when the mentor sends it.",
  },
  {
    icon: Building2,
    title: "Any MT4 or MT5 broker",
    body: "No hardcoded broker list and nothing to migrate. If your broker gives you MetaTrader credentials, the app can use them.",
  },
  {
    icon: CalendarClock,
    title: "News and the calendar, built in",
    body: "The market wire and the week's economic events sit inside the app, so you know what is about to move before a position is open.",
  },
  {
    icon: Fingerprint,
    title: "One licence, one phone",
    body: "Your key is bound to your handset the first time you use it. Nobody can pass it around, and changing phones is a deliberate step rather than an accident.",
  },
  {
    icon: WifiOff,
    title: "Survives a bad signal",
    body: "Lose connectivity and the app keeps working on its last known good licence for several days rather than locking you out at the worst moment.",
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
      "Lifetime access to the app",
      "Trades from your mentor's robot",
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
    q: "Do I need a mentor to use this?",
    a: "Yes. The app runs a mentor's robot against your account, so you need a licence key from one. If you do not have a mentor yet, the app has nothing to execute — buy it once you have your key.",
  },
  {
    q: "Does my mentor get access to my money?",
    a: "No. Your broker credentials stay between you and your broker, and your mentor never sees them. They send trade instructions; nothing in the system lets them withdraw, deposit or move funds.",
  },
  {
    q: "What happens if my phone is off?",
    a: "The trade still goes through. Calls are executed on our servers against your broker account, so the handset is where you watch and configure things, not where the trading happens.",
  },
  {
    q: "Which brokers work?",
    a: "Any broker that gives you MetaTrader 4 or MetaTrader 5 credentials. There is no approved list and nothing to switch to.",
  },
  {
    q: "Is this a subscription?",
    a: "No. You pay once for the app, and once more only if you want the chart scanner. There is no monthly fee and no billing token left sitting against your card.",
  },
  {
    q: "I got a new phone. Now what?",
    a:
      "Your licence is bound to one handset, so moving it is a paid step — R" +
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
                  Pay once &middot; No subscription
                </span>
              </Reveal>

              <Reveal index={1}>
                <h1
                  className="mt-7 max-w-[17ch] font-display text-[clamp(2.6rem,7vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.04em]"
                  style={{ textWrap: "balance" }}
                >
                  Your mentor&rsquo;s trades.{" "}
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: VISOR }}>
                    On your account.
                  </span>{" "}
                  Automatically.
                </h1>
              </Reveal>

              <Reveal index={2}>
                <p className="mt-7 max-w-[56ch] text-[clamp(1rem,1.7vw,1.19rem)] leading-relaxed text-ink-3">
                  You have a mentor whose calls are good. You have a job, a commute, and a phone
                  that is face-down half the day. NovaHost closes that gap: their trade reaches your
                  broker in seconds, sized to your balance, whether or not you saw the message.
                </p>
              </Reveal>

              <Reveal index={3}>
                <div className="mt-10">
                  <DownloadButtons />
                </div>
              </Reveal>

              <Reveal index={4}>
                <p className="mt-5 text-[13.5px] text-ink-4">
                  Works with any MT4 or MT5 broker. You will need a licence key from your mentor.
                </p>
              </Reveal>

              {/* The three claims a sceptic checks first. */}
              <Reveal index={5}>
                <dl className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
                  {[
                    ["Seconds", "from their screen to your broker"],
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

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="scroll-mt-20 px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>01 &mdash; How it works</SectionLabel>
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

      {/* ═══ FEATURES ═══════════════════════════════════════════════════════ */}
      <section id="features" className="scroll-mt-20 border-t border-hairline px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>02 &mdash; What you get</SectionLabel>
            <Heading className="max-w-[24ch]">The boring parts, handled properly.</Heading>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </section>

      {/* ═══ CHART SCANNER ══════════════════════════════════════════════════ */}
      <section id="scanner" className="scroll-mt-20 border-t border-hairline px-6 py-24">
        <div className="mx-auto grid max-w-[1140px] items-center gap-14 lg:grid-cols-2">
          <Reveal index={0}>
            <SectionLabel>03 &mdash; Optional add-on</SectionLabel>
            <Heading className="max-w-[18ch]">A second opinion on any chart.</Heading>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-3">
              Sometimes you want to take your own trade. Screenshot the chart, hand it to the
              scanner, and get a structured read back &mdash; the levels, the reasoning, and an
              honest score against the risk rules you already set.
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
              One payment, in Rand, through PayFast. No monthly fee, and no billing token left
              sitting against your card afterwards.
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
              Prices include VAT where applicable. You buy the app once; your mentor issues the
              licence key that ties it to their robot.
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
          <Heading className="mt-7">Get it on your phone.</Heading>
          <p className="mx-auto mt-4 max-w-[46ch] text-[16px] leading-relaxed text-ink-3">
            Install it, enter the key your mentor gave you, connect your broker. The next call they
            send is the first one you do not have to be awake for.
          </p>
          <div className="mt-9 flex justify-center">
            <DownloadButtons />
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-[13px] text-ink-4">
            <ShieldCheck size={14} className="text-cyan" />
            Your broker credentials never leave your account
          </p>
          <a
            href="#how-it-works"
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
