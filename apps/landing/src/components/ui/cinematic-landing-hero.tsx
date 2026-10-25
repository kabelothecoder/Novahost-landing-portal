import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Mic, Smartphone, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { IOS_APP_URL } from "@/lib/site";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* Recoloured from the original component to the marketing palette: ink
   #F2F4F8 for "foreground", and the visor's violet/magenta in the card. */
const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }

  .film-grain {
    position: absolute; inset: 0; pointer-events: none; z-index: 50; opacity: 0.05; mix-blend-mode: overlay;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
  }
  .bg-grid-theme {
    background-size: 60px 60px;
    background-image:
      linear-gradient(to right, rgba(242,244,248,0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(242,244,248,0.05) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }
  .text-3d-matte {
    color: #F2F4F8;
    text-shadow: 0 10px 30px rgba(242,244,248,0.18), 0 2px 4px rgba(242,244,248,0.08);
  }
  .text-visor {
    background: linear-gradient(90deg, #F0439E 0%, #A855F7 50%, #22C9E8 100%);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    transform: translateZ(0);
    filter: drop-shadow(0 10px 24px rgba(168,85,247,0.35));
  }
  .text-silver-matte {
    background: linear-gradient(180deg, #F2F4F8 0%, rgba(242,244,248,0.4) 100%);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    transform: translateZ(0);
  }
  .text-card-silver-matte {
    background: linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    transform: translateZ(0);
    filter: drop-shadow(0 12px 24px rgba(0,0,0,0.8)) drop-shadow(0 4px 8px rgba(0,0,0,0.6));
  }
  .premium-depth-card {
    background:
      radial-gradient(900px circle at 85% 0%, rgba(240,67,158,0.18), transparent 55%),
      radial-gradient(700px circle at 0% 100%, rgba(34,201,232,0.14), transparent 55%),
      linear-gradient(145deg, #1A1030 0%, #07070E 100%);
    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.9), 0 20px 40px -20px rgba(0,0,0,0.8),
      inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.8);
    border: 1px solid rgba(255,255,255,0.05);
    position: relative;
  }
  .card-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06) 0%, transparent 40%);
    mix-blend-mode: screen;
  }
  .iphone-bezel {
    background-color: #111;
    box-shadow: inset 0 0 0 2px #52525B, inset 0 0 0 7px #000, 0 40px 80px -15px rgba(0,0,0,0.9), 0 15px 25px -5px rgba(0,0,0,0.7);
    transform-style: preserve-3d;
  }
  .hardware-btn {
    background: linear-gradient(90deg, #404040 0%, #171717 100%);
    box-shadow: -2px 0 5px rgba(0,0,0,0.8), inset -1px 0 1px rgba(255,255,255,0.15), inset 1px 0 2px rgba(0,0,0,0.8);
  }
  .screen-glare { background: linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%); }
  .floating-ui-badge {
    background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 25px 50px -12px rgba(0,0,0,0.8),
      inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.5);
  }
  .btn-modern-light, .btn-modern-dark { transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
  .btn-modern-light {
    background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%); color: #0F172A;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 12px 24px -4px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.06);
  }
  .btn-modern-light:hover { transform: translateY(-3px); }
  .btn-modern-dark {
    background: linear-gradient(180deg, #27272A 0%, #18181B 100%); color: #FFFFFF;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 12px 24px -4px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.15);
  }
  .btn-modern-dark:hover { transform: translateY(-3px); background: linear-gradient(180deg, #3F3F46 0%, #27272A 100%); }
`;

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string;
  tagline1?: string;
  tagline2?: string;
  cardHeading?: string;
  cardDescription?: React.ReactNode;
  screenSrc?: string;
  ctaHeading?: string;
  ctaDescription?: string;
  header?: React.ReactNode;
}

/**
 * A pinned, scroll-scrubbed hero: tagline → a card rises over it with the app
 * on a phone → pulls back to the install buttons.
 */
export function CinematicHero({
  brandName = "NovaHost",
  tagline1 = "Your trading bot,",
  tagline2 = "off the PC.",
  cardHeading = "Command Core, in your pocket.",
  cardDescription,
  screenSrc = "/app/home.png",
  ctaHeading = "Turn the laptop off.",
  ctaDescription = "Install the app, enter your licence key, connect your broker. Your robot trades around the clock from our servers.",
  header,
  className,
  ...props
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2) return;
      cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        if (!mainCardRef.current || !mockupRef.current) return;
        const rect = mainCardRef.current.getBoundingClientRect();
        mainCardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        mainCardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        const xVal = (e.clientX / window.innerWidth - 0.5) * 2;
        const yVal = (e.clientY / window.innerHeight - 0.5) * 2;
        gsap.to(mockupRef.current, { rotationY: xVal * 12, rotationX: -yVal * 12, ease: "power3.out", duration: 1.2 });
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      gsap.set(".text-track", { autoAlpha: 0, y: 60, scale: 0.85, filter: "blur(20px)", rotationX: -20 });
      gsap.set(".text-days", { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" });
      gsap.set(".main-card", { yPercent: 140, autoAlpha: 1 });
      gsap.set([".card-left-text", ".card-right-text", ".mockup-scroll-wrapper", ".floating-badge"], { autoAlpha: 0 });
      gsap.set(".cta-wrapper", { autoAlpha: 0, scale: 0.8, filter: "blur(30px)" });

      gsap
        .timeline({ delay: 0.3 })
        .to(".text-track", { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", rotationX: 0, ease: "expo.out" })
        .to(".text-days", { duration: 1.4, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" }, "-=1.0");

      gsap
        .timeline({
          scrollTrigger: { trigger: containerRef.current, start: "top top", end: "+=5000", pin: true, scrub: 1, anticipatePin: 1 },
        })
        .to([".hero-text-wrapper", ".bg-grid-theme"], { scale: 1.15, filter: "blur(20px)", opacity: 0.2, ease: "power2.inOut", duration: 2 }, 0)
        .to(".main-card", { yPercent: 0, ease: "power3.inOut", duration: 2 }, 0)
        .to(".main-card", { width: "100%", height: "100%", borderRadius: "0px", ease: "power3.inOut", duration: 1.5 })
        .fromTo(
          ".mockup-scroll-wrapper",
          { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
          { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 2.5 },
          "-=0.8",
        )
        .fromTo(
          ".floating-badge",
          { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 },
          { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: "back.out(1.5)", duration: 1.5, stagger: 0.2 },
          "-=1.5",
        )
        .fromTo(".card-left-text", { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "power4.out", duration: 1.5 }, "-=1.5")
        .fromTo(".card-right-text", { x: 50, autoAlpha: 0, scale: 0.8 }, { x: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 1.5 }, "<")
        .to({}, { duration: 2.5 })
        .set(".hero-text-wrapper", { autoAlpha: 0 })
        .set(".cta-wrapper", { autoAlpha: 1 })
        .to({}, { duration: 1.5 })
        .to([".mockup-scroll-wrapper", ".floating-badge", ".card-left-text", ".card-right-text"], {
          scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: "power3.in", duration: 1.2, stagger: 0.05,
        })
        .to(
          ".main-card",
          { width: isMobile ? "92vw" : "85vw", height: isMobile ? "92vh" : "85vh", borderRadius: isMobile ? "32px" : "40px", ease: "expo.inOut", duration: 1.8 },
          "pullback",
        )
        .to(".cta-wrapper", { scale: 1, filter: "blur(0px)", ease: "expo.inOut", duration: 1.8 }, "pullback")
        .to(".main-card", { yPercent: -160, ease: "power3.in", duration: 1.5 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex h-screen w-full items-center justify-center overflow-hidden bg-ground font-sans text-ink antialiased", className)}
      style={{ perspective: "1500px" }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-theme pointer-events-none absolute inset-0 z-0 opacity-50" aria-hidden="true" />
      {header && <div className="absolute inset-x-0 top-0 z-[60]">{header}</div>}

      {/* Taglines */}
      <div className="hero-text-wrapper absolute z-10 flex w-full flex-col items-center justify-center px-4 text-center will-change-transform">
        <h1 className="text-track gsap-reveal text-3d-matte mb-2 font-display text-5xl font-bold tracking-tight md:text-7xl lg:text-[6rem]">
          {tagline1}
        </h1>
        <h1 className="text-days gsap-reveal text-visor font-display text-5xl font-extrabold tracking-tighter md:text-7xl lg:text-[6rem]">
          {tagline2}
        </h1>
        <p className="mt-6 max-w-xl text-base text-ink-3 md:text-lg">
          NovaHost hosts your Expert Advisor so it trades your own MT4/MT5 account 24/7 — no PC, no VPS.
        </p>
      </div>

      {/* Closing CTA */}
      <div className="cta-wrapper gsap-reveal pointer-events-auto absolute z-10 flex w-full flex-col items-center justify-center px-4 text-center will-change-transform">
        <h2 className="text-silver-matte mb-6 font-display text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">{ctaHeading}</h2>
        <p className="mx-auto mb-12 max-w-xl text-lg font-light leading-relaxed text-ink-3 md:text-xl">{ctaDescription}</p>
        <div className="flex flex-col gap-6 sm:flex-row">
          <a href={IOS_APP_URL} className="btn-modern-light group flex items-center justify-center gap-3 rounded-[1.25rem] px-8 py-4">
            <Smartphone className="h-7 w-7 transition-transform group-hover:scale-105" />
            <div className="text-left">
              <div className="mb-[-2px] text-[10px] font-bold uppercase tracking-wider text-neutral-500">iPhone &amp; Android</div>
              <div className="text-xl font-bold leading-none tracking-tight">Install the app</div>
            </div>
          </a>
        </div>
      </div>

      {/* The card */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" style={{ perspective: "1500px" }}>
        <div
          ref={mainCardRef}
          className="main-card premium-depth-card gsap-reveal pointer-events-auto relative flex h-[92vh] w-[92vw] items-center justify-center overflow-hidden rounded-[32px] md:h-[85vh] md:w-[85vw] md:rounded-[40px]"
        >
          <div className="card-sheen" aria-hidden="true" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col items-center justify-evenly px-4 py-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:px-12 lg:py-0">
            <div className="card-right-text gsap-reveal order-1 flex w-full justify-center lg:order-3 lg:justify-end">
              <h2 className="text-card-silver-matte font-display text-5xl font-black uppercase tracking-tighter md:text-[5rem] lg:text-[6.5rem]">
                {brandName}
              </h2>
            </div>

            <div className="mockup-scroll-wrapper relative order-2 flex h-[380px] w-full items-center justify-center lg:h-[600px]" style={{ perspective: "1000px" }}>
              <div className="relative flex h-full w-full scale-[0.65] items-center justify-center md:scale-[0.85] lg:scale-100">
                <div ref={mockupRef} className="iphone-bezel relative flex h-[580px] w-[280px] flex-col rounded-[3rem] will-change-transform">
                  <div className="hardware-btn absolute -left-[3px] top-[120px] h-[25px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -left-[3px] top-[160px] h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -left-[3px] top-[220px] h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -right-[3px] top-[170px] h-[70px] w-[3px] scale-x-[-1] rounded-r-md" aria-hidden="true" />

                  <div className="absolute inset-[7px] z-10 overflow-hidden rounded-[2.5rem] bg-[#050914] shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                    <div className="screen-glare pointer-events-none absolute inset-0 z-40" aria-hidden="true" />
                    <div className="absolute left-1/2 top-[5px] z-50 flex h-[28px] w-[100px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-3">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    </div>
                    <img
                      src={screenSrc}
                      alt="NovaHost Command Core home screen"
                      className="h-full w-full object-cover object-top pt-6"
                      draggable={false}
                    />
                  </div>
                </div>

                <div className="floating-badge floating-ui-badge absolute left-[-15px] top-6 z-30 flex items-center gap-3 rounded-xl p-3 lg:left-[-80px] lg:top-12 lg:gap-4 lg:rounded-2xl lg:p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 lg:h-10 lg:w-10">
                    <Zap className="h-4 w-4 text-emerald-400 lg:h-5 lg:w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-tight text-white lg:text-sm">Robot executed BUY</p>
                    <p className="text-[10px] font-medium text-ink-3 lg:text-xs">XAUUSD · from our servers</p>
                  </div>
                </div>

                <div className="floating-badge floating-ui-badge absolute bottom-12 right-[-15px] z-30 flex items-center gap-3 rounded-xl p-3 lg:bottom-20 lg:right-[-80px] lg:gap-4 lg:rounded-2xl lg:p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-violet/30 bg-violet/15 lg:h-10 lg:w-10">
                    <Mic className="h-4 w-4 text-violet lg:h-5 lg:w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-tight text-white lg:text-sm">&ldquo;How&rsquo;s my account?&rdquo;</p>
                    <p className="text-[10px] font-medium text-ink-3 lg:text-xs">Push-to-talk voice</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-left-text gsap-reveal order-3 flex w-full flex-col justify-center px-4 text-center lg:order-1 lg:px-0 lg:text-left">
              <h3 className="mb-0 font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:mb-5 lg:text-4xl">{cardHeading}</h3>
              <p className="mx-auto hidden max-w-sm text-sm leading-relaxed text-ink-2 md:block md:text-base lg:mx-0 lg:max-w-none lg:text-lg">
                {cardDescription ?? (
                  <>
                    A live HUD for your <span className="font-semibold text-white">robot, market feed and broker link</span>.
                    The trading happens on our servers — your phone is where you watch, talk to it and steer.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
