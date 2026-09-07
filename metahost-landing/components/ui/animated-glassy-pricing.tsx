"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Star, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  eaSlots: string;
  badge?: string;
  isPopular?: boolean;
  color: string;
  glowColor: string;
  icon: React.ElementType;
}

interface ModernPricingPageProps {
  plans?: PricingPlan[];
  className?: string;
}

const defaultPlans: PricingPlan[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: "R349",
    period: "/month",
    description: "Perfect for traders testing the waters",
    eaSlots: "1 – 3 EAs",
    features: [
      "Up to 3 Expert Advisors",
      "Ultra-low latency VPS",
      "MT4 & MT5 support",
      "Mobile dashboard access",
      "Email support",
    ],
    color: "rgba(99,102,241,1)",
    glowColor: "rgba(99,102,241,0.3)",
    icon: Zap,
  },
  {
    id: "quarterly",
    name: "3-Months",
    price: "R799",
    period: "/3 months",
    description: "Most popular — serious traders save more",
    eaSlots: "3 – 6 EAs",
    badge: "Most Popular",
    isPopular: true,
    features: [
      "Up to 6 Expert Advisors",
      "Priority ultra-low latency",
      "MT4, MT5 & cTrader",
      "Advanced mobile analytics",
      "Priority support + Discord",
      "One-click EA deployment",
    ],
    color: "rgba(139,92,246,1)",
    glowColor: "rgba(139,92,246,0.35)",
    icon: Star,
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: "R3499",
    period: "one-time",
    description: "For power traders who want everything, forever",
    eaSlots: "6+ EAs",
    features: [
      "Unlimited Expert Advisors",
      "Dedicated server allocation",
      "All platform support",
      "White-label mobile app",
      "24/7 concierge support",
      "Custom latency routing",
      "Lifetime updates included",
    ],
    color: "rgba(236,72,153,1)",
    glowColor: "rgba(236,72,153,0.3)",
    icon: Crown,
  },
];

/**
 * @description Animated glassmorphic pricing cards with Framer Motion hover effects.
 * The popular plan has a persistent glow ring and a "Most Popular" badge.
 * Accepts a `plans` prop to override default NovaHost pricing tiers.
 */
export function ModernPricingPage({
  plans = defaultPlans,
  className,
}: ModernPricingPageProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan, i) => {
          const Icon = plan.icon;
          const isHovered = hoveredId === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              onHoverStart={() => setHoveredId(plan.id)}
              onHoverEnd={() => setHoveredId(null)}
              whileHover={{ y: -8 }}
              className="relative cursor-pointer"
            >
              {/* Popular glow ring */}
              {plan.isPopular && (
                <div
                  className="absolute -inset-px rounded-3xl pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${plan.color}60, transparent, ${plan.color}40)`,
                    animation: "pulse-border 3s ease-in-out infinite",
                  }}
                />
              )}

              {/* Card */}
              <div
                className={cn(
                  "relative rounded-3xl p-8 h-full flex flex-col overflow-hidden transition-all duration-500",
                  plan.isPopular
                    ? "bg-white/[0.07] border border-white/20"
                    : "bg-white/[0.03] border border-white/8"
                )}
                style={{
                  boxShadow: isHovered
                    ? `0 0 60px ${plan.glowColor}, 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`
                    : plan.isPopular
                    ? `0 0 40px ${plan.glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`
                    : "inset 0 1px 0 rgba(255,255,255,0.04)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className="absolute top-5 right-5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-white"
                    style={{ background: plan.color }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: `${plan.color}20`,
                    border: `1px solid ${plan.color}40`,
                  }}
                >
                  <Icon size={22} style={{ color: plan.color }} strokeWidth={1.8} />
                </div>

                {/* Plan name */}
                <p className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-2">
                  {plan.name}
                </p>
                <p className="text-sm text-white/30 mb-6 leading-relaxed">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-extrabold text-white tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-white/40">{plan.period}</span>
                </div>

                {/* EA Slot badge */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-8 w-fit"
                  style={{
                    background: `${plan.color}15`,
                    border: `1px solid ${plan.color}30`,
                    color: plan.color,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: plan.color }} />
                  {plan.eaSlots}
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-white/60">
                      <div
                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: `${plan.color}20` }}
                      >
                        <Check size={11} style={{ color: plan.color }} strokeWidth={2.5} />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all duration-300"
                  style={{
                    background: plan.isPopular
                      ? plan.color
                      : `${plan.color}20`,
                    border: `1px solid ${plan.color}40`,
                    boxShadow: plan.isPopular ? `0 4px 20px ${plan.glowColor}` : "none",
                  }}
                >
                  Get Started
                  <ArrowRight size={15} strokeWidth={2} />
                </motion.button>

                {/* Decorative corner gradient */}
                <div
                  className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none"
                  style={{ background: plan.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse-border {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
