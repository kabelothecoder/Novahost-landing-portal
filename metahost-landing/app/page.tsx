"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PixelHero } from "@/components/ui/pixel-perfect-hero";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { MagneticText } from "@/components/ui/morphing-cursor";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#121212] text-white selection:bg-indigo-500/30">
      <PixelHero
        word1={<AnimatedText text="NovaHost" />}
        word2={<MagneticText text="AUTOMATION" hoverText="PRECISION" />}
        description="Minimalist mobile algorithmic trading. Connect your Expert Advisors to our ultra-low latency VPS directly from your device."
        primaryActionText="Mentor Login"
        secondaryActionText="Download App .APK"
        onPrimaryClick={() => {
          router.push("/auth/login");
        }}
        onSecondaryClick={() => {
          // Trigger APK download or route to download section
          window.location.href = "/downloads/novahost-app.apk";
        }}
      />
    </main>
  );
}
