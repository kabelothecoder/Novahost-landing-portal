import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { CheckCheck, Zap } from "lucide-react";
import { useInView } from "framer-motion";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { VISOR } from "@/components/Brand";
import { IOS_APP_URL, PAYPAL_DAYS, PAYPAL_PRICE_USD, PAYPAL_URL } from "@/lib/site";

const reveal = {
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { delay: i * 0.3, duration: 0.5 },
  }),
  hidden: { filter: "blur(10px)", y: -20, opacity: 0 },
};
const stagger = {
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
  hidden: { filter: "blur(10px)", y: -20, opacity: 0 },
};

const FEATURES = [
  "Your robot hosted and trading 24/7",
  "Command Core live HUD on your phone",
  "Push-to-talk voice assistant",
  "AI chart scanner — 1 free scan every month",
  "Funded-account rules and daily target lock",
  "Risk controls and balance-aware lot sizing",
  "Any MT4 / MT5 broker",
  "Trade alerts on your iPhone",
];

/**
 * One plan, one price. The number counts up from zero the first time the
 * section scrolls into view.
 */
export default function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (inView) setPrice(PAYPAL_PRICE_USD);
  }, [inView]);

  return (
    <div ref={ref} className="relative mx-auto w-full overflow-hidden px-4 py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: "radial-gradient(110% 90% at 50% 100%, rgba(168,85,247,0.22) 0%, transparent 60%)" }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <TimelineContent
          as="div"
          animationNum={0}
          timelineRef={ref}
          customVariants={reveal}
          className="mb-4 flex items-center justify-center"
        >
          <Zap className="mr-2 h-5 w-5 fill-cyan text-cyan" />
          <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-cyan">
            04 &mdash; Pricing
          </span>
        </TimelineContent>

        <h2 className="mb-4 font-display text-3xl font-extrabold leading-[120%] tracking-[-0.03em] text-ink sm:text-4xl md:text-5xl">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.15}
            staggerFrom="first"
            reverse
            autoStart={inView}
            containerClassName="justify-center"
            transition={{ type: "spring", stiffness: 250, damping: 40, delay: 0.4 }}
          >
            One plan. Everything included.
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={ref}
          customVariants={reveal}
          className="text-lg text-ink-3"
        >
          Pay once with PayPal, install the app, enter your licence key. No VPS bill, no auto-renewal.
        </TimelineContent>
      </div>

      <div className="relative mx-auto mt-16 grid max-w-5xl items-center gap-6 rounded-3xl border border-edge bg-card/80 p-6 backdrop-blur sm:p-10 md:grid-cols-2 md:gap-12">
        <div>
          <TimelineContent
            as="h3"
            animationNum={2}
            timelineRef={ref}
            customVariants={reveal}
            className="mb-5 font-display text-2xl font-semibold text-ink"
          >
            What&rsquo;s inside
          </TimelineContent>
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <TimelineContent
                key={f}
                as="div"
                animationNum={3 + i}
                timelineRef={ref}
                customVariants={stagger}
                className="flex items-center"
              >
                <div
                  className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-md shadow-violet/40"
                  style={{ backgroundImage: VISOR }}
                >
                  <CheckCheck className="h-4 w-4 text-ground" />
                </div>
                <span className="text-ink-2">{f}</span>
              </TimelineContent>
            ))}
          </div>
        </div>

        <TimelineContent
          as="div"
          animationNum={4}
          timelineRef={ref}
          customVariants={reveal}
          className="rounded-2xl border border-edge bg-ground/60 p-8 text-center"
        >
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
            Robot access
          </p>
          <div className="mt-4 flex items-baseline justify-center gap-1">
            <span className="text-2xl font-medium text-ink-3">$</span>
            <NumberFlow value={price} className="font-display text-6xl font-extrabold tracking-[-0.04em] text-ink" />
          </div>
          <p className="mt-2 text-ink-4">once off &middot; {PAYPAL_DAYS} days of access</p>
          <a
            href={PAYPAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex h-14 w-full items-center justify-center rounded-full text-lg font-semibold text-ground transition-transform hover:scale-[1.02]"
            style={{ backgroundImage: VISOR }}
          >
            Buy with PayPal
          </a>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-4">
            Put the email you will use in the app in the PayPal note. We switch your access on once the
            payment is confirmed.
          </p>
          <a href={IOS_APP_URL} className="mt-4 inline-block text-[14px] font-medium text-cyan hover:underline">
            Already paid? Open the app
          </a>
          <p className="mt-4 text-[13px] text-ink-4">Prices include VAT where applicable.</p>
        </TimelineContent>
      </div>
    </div>
  );
}
