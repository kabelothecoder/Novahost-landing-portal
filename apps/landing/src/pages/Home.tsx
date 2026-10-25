import {
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
  Server,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Target,
  Trophy,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { Heading, Mark, SectionLabel, VISOR, VisorRule } from "@/components/Brand";
import { DownloadButtons } from "@/components/DownloadButtons";
import { Footer } from "@/components/Footer";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import PricingSection from "@/components/ui/pricing-section-1";
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
  ["What it costs to keep running", "Electricity, or ~$15 a month for a VPS", "R"+PRICES.app+" per 30 days, hosting included"],
  ["When your machine is off", "The bot stops trading", "The bot keeps trading"],
  ["Setting it up", "Install MetaTrader, attach the EA, tune it", "Enter a key, connect your broker"],
  ["Watching it", "Remote desktop into the VPS", "Open the app"],
] as const;

const STEPS = [
  {
    n: "01",
    title: "Get the app",
    body: "Open the app in your phone's browser — iPhone or Android — and add it to your home screen. No App Store, no Play Store. Pay in Rand through PayFast for 30 days of access.",
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

/** The headline features for traders who run more than one account. */
const POWER_FEATURES = [
  {
    icon: Users,
    title: "Multiple broker accounts",
    body: "Run the same robot on more than one MT4/MT5 account from a single licence — your personal account and a funded one, side by side, each with its own lot size.",
    points: ["One licence, several accounts", "Own lot multiplier per account", "Switch between them in the app"],
  },
  {
    icon: Trophy,
    title: "Funded & challenge accounts",
    body: "Tag an account as a challenge or funded account, add the firm's daily loss limit and max drawdown, and track your progress to the phase target.",
    points: ["Daily loss and max drawdown rules", "Phase 1, Phase 2 or Funded", "Lot size as a % of challenge balance"],
  },
  {
    icon: Target,
    title: "Daily target lock",
    body: "Set a daily profit target and a loss limit. When one is hit, you choose: the robot stops for the day, or it keeps going.",
    points: ["Stop at target, or keep trading", "Daily loss limit as a hard floor", "Alert the moment either is hit"],
  },
] as const;

const VOICE_POINTS = [
  "Push to talk — it only listens while you hold the mic",
  "Answers out loud, in the robot's own voice",
  "Trade ideas are tap-to-confirm, never automatic",
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
    a: "No auto-billing. You pay R" + PRICES.app + " for 30 days of access, and renew from the app only if you want to. No billing token is left sitting against your card.",
  },
  {
    q: "Which brokers work?",
    a: "Any broker that gives you MetaTrader 4 or MetaTrader 5 credentials. There is no approved list and nothing to switch to.",
  },
  {
    q: "I got a new phone. Now what?",
    a:
      "Your licence binds to one handset, so moving it is a deliberate step from the app that keeps your existing key and shifts it across. It exists to stop one key being shared around, not to punish you for upgrading.",
  },
] as const;

/** A captured app screen in a slim phone frame. */
function AppScreen({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 rounded-full opacity-[0.22] blur-[90px]"
        style={{ background: VISOR }}
      />
      <div className="relative overflow-hidden rounded-[2.6rem] border border-[#2A2E3A] bg-black p-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]">
        <img src={src} alt={alt} loading="lazy" className="w-full rounded-[2.1rem]" />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <CinematicHero header={<Header />} />

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

      {/* ═══ THE APP ═══════════════════════════════════════ */}
      <section id="the-app" className="scroll-mt-20 border-t border-hairline px-6 py-24">
        <div className="mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>03 &mdash; The app</SectionLabel>
            <Heading className="max-w-[22ch]">One app, every phone.</Heading>
            <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-ink-3">
              The same app runs on iPhone and Android. Open it in your phone&rsquo;s browser, add it
              to your home screen, and it opens full screen with its own icon &mdash; no App Store,
              no Play Store, no waiting on a review.
            </p>
          </Reveal>

          <Reveal
            index={1}
            className="relative mt-14 overflow-hidden rounded-2xl border border-edge bg-card p-8"
          >
            <VisorRule className="absolute inset-x-8 top-0" />
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#23262F] bg-hairline">
              <Smartphone size={19} className="text-cyan" />
            </span>
            <h3 className="mt-5 font-display text-[21px] font-bold tracking-[-0.02em]">
              iPhone &amp; Android
            </h3>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {[
                "Add to Home Screen, done in seconds",
                "Full screen, own icon, no browser bar",
                "Updates arrive without a reinstall",
                "Same account on whichever phone you use",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                  <Check size={15} className="mt-[3px] shrink-0 text-cyan" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* ─── What the app carries ─── */}
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
              The app carries the market wire and the week&rsquo;s economic calendar, so you know
              what is about to move before a position is open.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══ CHART SCANNER ══════════════════════════════════════════════════ */}
      <section className="border-t border-hairline px-6 py-24">
        <div className="mx-auto grid max-w-[1140px] items-center gap-14 lg:grid-cols-2">
          <Reveal index={0}>
            <SectionLabel>AI chart scanner</SectionLabel>
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
              One free scan every month is included with your plan.
            </p>
          </Reveal>

          <Reveal index={1}>
            <AppScreen src="/app/scanner.png" alt="NovaHost AI chart scanner screen" />
          </Reveal>
        </div>
      </section>

      {/* ═══ VOICE ══════════════════════════════════════════════════════════ */}
      <section className="border-t border-hairline px-6 py-24">
        <div className="mx-auto grid max-w-[1140px] items-center gap-14 lg:grid-cols-2">
          <Reveal index={1} className="order-2 lg:order-1">
            <AppScreen src="/app/voice.png" alt="NovaHost home with the push-to-talk mic" />
          </Reveal>
          <Reveal index={0} className="order-1 lg:order-2">
            <SectionLabel>New in the app</SectionLabel>
            <Heading className="max-w-[18ch]">Talk to your robot.</Heading>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-3">
              Hold the mic and ask how the account is doing, what the robot just did, or what is on
              the calendar. It answers out loud. Ask for a trade and it drafts the idea and waits
              &mdash; nothing is sent until you tap to confirm.
            </p>
            <ul className="mt-8 space-y-3.5">
              {VOICE_POINTS.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[15px] text-ink-2">
                  <Check size={16} className="mt-[3px] shrink-0 text-cyan" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ═══ POWER FEATURES ═════════════════════════════════════════════════ */}
      <section id="features" className="relative scroll-mt-20 overflow-hidden border-t border-hairline px-6 py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.12] blur-[120px]"
          style={{ background: VISOR }}
        />
        <div className="relative mx-auto max-w-[1140px]">
          <Reveal index={0}>
            <SectionLabel>Built for serious traders</SectionLabel>
            <Heading className="max-w-[22ch]">Every account. Every rule. One robot.</Heading>
            <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-ink-3">
              Passing a prop-firm challenge, running a personal account next to a funded one, or
              just want the robot to stop once the day is made &mdash; it is all in the app.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {POWER_FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                index={i + 1}
                className="relative overflow-hidden rounded-2xl border border-edge bg-card p-8"
              >
                <VisorRule className="absolute inset-x-8 top-0" />
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-ground"
                  style={{ backgroundImage: VISOR }}
                >
                  <f.icon size={21} />
                </span>
                <h3 className="mt-6 font-display text-[21px] font-bold tracking-[-0.02em]">{f.title}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">{f.body}</p>
                <ul className="mt-6 space-y-2.5">
                  {f.points.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                      <Check size={15} className="mt-[3px] shrink-0 text-cyan" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ════════════════════════════════════════════════════════ */}
      <section id="pricing" className="scroll-mt-20 border-t border-hairline">
        <PricingSection />
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
