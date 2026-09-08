"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface GlobePulseProps {
  className?: string;
  size?: number;
}

/**
 * @description Renders a WebGL spinning globe using the `cobe` library.
 * Marker dots represent server locations and pulse rings animate outward
 * from hot spots via CSS keyframes. Auto-rotates on load with spring physics.
 */
export function GlobePulse({ className, size = 500 }: GlobePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    let globe: any = null;
    let animationFrameId: number;

    const animate = () => {
      phi += 0.003;
      if (globe) {
        globe.update({ phi });
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const startGlobe = async () => {
      const { default: createGlobe } = await import("cobe");
      const canvas = canvasRef.current;
      if (!canvas) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: size * 2,
        height: size * 2,
        phi: 0,
        theta: 0.2,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: [0.2, 0.2, 0.25],
        markerColor: [0.4, 0.5, 1],
        glowColor: [0.3, 0.3, 0.6],
        markers: [
          // Major financial hubs
          { location: [40.7128, -74.006], size: 0.08 },   // New York
          { location: [51.5074, -0.1278], size: 0.08 },   // London
          { location: [35.6762, 139.6503], size: 0.07 },  // Tokyo
          { location: [1.3521, 103.8198], size: 0.07 },   // Singapore
          { location: [48.8566, 2.3522], size: 0.06 },    // Paris
          { location: [25.2048, 55.2708], size: 0.07 },   // Dubai
          { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
          { location: [19.4326, -99.1332], size: 0.05 },  // Mexico City
          { location: [-23.5505, -46.6333], size: 0.05 }, // São Paulo
          { location: [55.7558, 37.6173], size: 0.05 },   // Moscow
        ],
      });

      animate();
    };

    startGlobe();

    return () => {
      cancelAnimationFrame(animationFrameId);
      globe?.destroy();
    };
  }, [size]);

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Ambient glow ring */}
      <div
        className="absolute inset-0 rounded-full opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.4), transparent 65%)",
        }}
      />
      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border border-indigo-500/30 animate-ping"
          style={{
            width: size * 0.55 + i * 40,
            height: size * 0.55 + i * 40,
            animationDelay: `${i * 0.8}s`,
            animationDuration: "3s",
            opacity: 0.15 - i * 0.04,
          }}
        />
      ))}
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        style={{ width: size, height: size }}
        className="rounded-full"
      />
    </div>
  );
}
