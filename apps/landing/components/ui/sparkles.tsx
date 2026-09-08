"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SparklesProps {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export function SparklesCore({
  id = "sparkles-canvas",
  className,
  background = "transparent",
  minSize = 0.6,
  maxSize = 1.4,
  speed = 0.5,
  particleColor = "#ffffff",
  particleDensity = 120,
}: SparklesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const initParticle = useCallback(
    (canvas: HTMLCanvasElement): Particle => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * speed * 0.3,
        vy: (Math.random() - 0.5) * speed * 0.3,
        size: minSize + Math.random() * (maxSize - minSize),
        alpha: Math.random(),
        life: Math.random() * 200,
        maxLife: 150 + Math.random() * 100,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        twinkleOffset: Math.random() * Math.PI * 2,
      };
    },
    [minSize, maxSize, speed]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      particlesRef.current = Array.from({ length: particleDensity }, () =>
        initParticle(canvas)
      );
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const animate = (time: number) => {
      timeRef.current = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // twinkle
        const twinkle =
          0.4 + 0.6 * Math.abs(Math.sin(time * p.twinkleSpeed + p.twinkleOffset));
        const fadeIn = Math.min(p.life / 40, 1);
        const fadeOut = Math.max((p.maxLife - p.life) / 40, 0);
        const alpha = p.alpha * twinkle * Math.min(fadeIn, fadeOut);

        // wrap or reset
        if (p.life > p.maxLife) {
          particlesRef.current[i] = initParticle(canvas);
          return;
        }
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = particleColor;
        ctx.shadowBlur = 4;
        ctx.shadowColor = particleColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
    };
  }, [initParticle, particleDensity, particleColor]);

  return (
    <canvas
      id={id}
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full", className)}
      style={{ background, pointerEvents: "none" }}
    />
  );
}
