"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, Activity, Search, CheckCircle, Zap, Send } from "lucide-react";

export interface OrbitalItem {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  orbitRadius?: number;
}

export const timelineData: OrbitalItem[] = [
  {
    id: 1,
    title: "Data Ingestion",
    description: "Connecting to live tick data and tracking active overlap sessions.",
    icon: Activity,
    color: "rgba(99,102,241,1)", // Indigo
    bgColor: "rgba(99,102,241,0.1)",
  },
  {
    id: 2,
    title: "Liquidity Sweep Detection",
    description: "Identifying high-probability liquidity zones and standard deviations.",
    icon: Search,
    color: "rgba(139,92,246,1)", // Violet
    bgColor: "rgba(139,92,246,0.1)",
  },
  {
    id: 3,
    title: "SMC Validation",
    description: "Validating structural market shifts and order block confirmations.",
    icon: CheckCircle,
    color: "rgba(236,72,153,1)", // Pink
    bgColor: "rgba(236,72,153,0.1)",
  },
  {
    id: 4,
    title: "Signal Execution",
    description: "Formulating dynamic lot sizes and distributing limit/stop orders.",
    icon: Zap,
    color: "rgba(245,158,11,1)", // Amber
    bgColor: "rgba(245,158,11,0.1)",
  },
  {
    id: 5,
    title: "Trade Broadcast",
    description: "Routing executing commands to connected MetaTrader/broker terminals.",
    icon: Send,
    color: "rgba(16,185,129,1)", // Emerald
    bgColor: "rgba(16,185,129,0.1)",
  },
];

interface RadialOrbitalTimelineProps {
  items?: OrbitalItem[];
  className?: string;
}

/**
 * @description Renders a radial orbital timeline where trading algorithm steps
 * orbit a central glowing core. Each item can be selected to show its detail card.
 * Uses Framer Motion for rotation and entrance animations.
 */
export function RadialOrbitalTimeline({
  items = timelineData,
  className,
}: RadialOrbitalTimelineProps) {
  const [activeItem, setActiveItem] = useState<OrbitalItem | null>(null);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Slow auto-rotation
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current) {
        const delta = time - lastTimeRef.current;
        setRotation((r) => (r + delta * 0.012) % 360);
      }
      lastTimeRef.current = time;
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const centerSize = 100;
  const viewSize = 520;
  const center = viewSize / 2;

  // Spread items evenly around the circle
  const radii = [100, 135, 170, 205, 240];

  return (
    <div
      className={cn(
        "relative flex flex-col lg:flex-row items-center gap-10 w-full",
        className
      )}
    >
      {/* SVG Orbital Diagram */}
      <div className="relative shrink-0" style={{ width: viewSize, height: viewSize }}>
        <svg
          width={viewSize}
          height={viewSize}
          viewBox={`0 0 ${viewSize} ${viewSize}`}
          className="absolute inset-0"
        >
          {/* Orbit rings */}
          {radii.map((r, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="rgba(99,102,241,0.12)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          ))}
          {/* Connector lines from center to nodes */}
          {items.map((item, i) => {
            const r = radii[i] ?? 180;
            const angle = ((i * 360) / items.length + rotation) * (Math.PI / 180);
            const nx = center + r * Math.cos(angle);
            const ny = center + r * Math.sin(angle);
            return (
              <line
                key={item.id}
                x1={center}
                y1={center}
                x2={nx}
                y2={ny}
                stroke={item.color}
                strokeWidth="0.5"
                opacity={0.2}
              />
            );
          })}
        </svg>

        {/* Central core */}
        <div
          className="absolute rounded-full flex items-center justify-center text-center p-2"
          style={{
            width: centerSize,
            height: centerSize,
            top: center - centerSize / 2,
            left: center - centerSize / 2,
            background:
              "radial-gradient(circle at 50% 35%, rgba(99,102,241,0.9), rgba(79,70,229,0.6))",
            boxShadow:
              "0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2), inset 0 1px 1px rgba(255,255,255,0.2)",
          }}
        >
          <span className="text-[10px] text-white/90 font-bold leading-tight tracking-widest uppercase">
            NovaHost<br />AI Core
          </span>
        </div>

        {/* Orbital nodes */}
        {items.map((item, i) => {
          const r = radii[i] ?? 180;
          const angle = ((i * 360) / items.length + rotation) * (Math.PI / 180);
          const nx = center + r * Math.cos(angle);
          const ny = center + r * Math.sin(angle);
          const Icon = item.icon;
          const isActive = activeItem?.id === item.id;

          return (
            <motion.button
              key={item.id}
              className="absolute flex items-center justify-center rounded-full cursor-pointer focus:outline-none"
              style={{
                width: 48,
                height: 48,
                top: ny - 24,
                left: nx - 24,
                background: item.bgColor,
                border: `1.5px solid ${item.color}`,
                boxShadow: isActive
                  ? `0 0 20px ${item.color}80, 0 0 40px ${item.color}30`
                  : `0 0 8px ${item.color}30`,
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveItem(isActive ? null : item)}
            >
              <Icon size={20} style={{ color: item.color }} strokeWidth={1.8} />
              {/* Step number badge */}
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-black text-white"
                style={{ background: item.color }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Detail cards column */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {items.map((item, i) => {
          const Icon = item.icon;
          const isActive = activeItem?.id === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
              onClick={() => setActiveItem(isActive ? null : item)}
              className={cn(
                "relative rounded-2xl p-4 cursor-pointer transition-all duration-300 border",
                isActive
                  ? "border-indigo-500/60 bg-white/5"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
              )}
              style={{
                boxShadow: isActive
                  ? `0 0 20px ${item.color}20, inset 0 1px 0 rgba(255,255,255,0.05)`
                  : "none",
              }}
            >
              {/* Colored left bar */}
              <div
                className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full"
                style={{ background: item.color }}
              />
              <div className="pl-4 flex items-start gap-3">
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: item.bgColor }}
                >
                  <Icon size={16} style={{ color: item.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-black tracking-widest"
                      style={{ color: item.color }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-white/50 leading-relaxed overflow-hidden"
                      >
                        {item.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  {!isActive && (
                    <p className="text-xs text-white/30 leading-relaxed line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
