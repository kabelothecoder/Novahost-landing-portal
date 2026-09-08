"use client";

import React from "react";
import { PixelHero } from "@/components/ui/pixel-perfect-hero";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { MagneticText } from "@/components/ui/morphing-cursor";

// The mentor portal is a separate Vercel project. This is its public
// auto-URL. Swap for https://novahost-portal.vercel.app once Deployment
// Protection is relaxed, or for the custom domain once it is attached.
const PORTAL_URL = "https://lumin-dash-6c2x.vercel.app";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#121212] text-white selection:bg-indigo-500/30">
      <PixelHero
        word1={<AnimatedText text="NovaHost" />}
        word2={<MagneticText text="AUTOMATION" hoverText="PRECISION" />}
        description="Minimalist mobile algorithmic trading. Connect your Expert Advisors to our ultra-low latency VPS directly from your device."
        primaryActionText="Mentor Login"
        secondaryActionText="Download App .APK"
        onPrimaryClick={() => {
          window.location.href = PORTAL_URL;
        }}
        onSecondaryClick={() => {
          // Trigger APK download or route to download section
          window.location.href = "/downloads/novahost-app.apk";
        }}
      />
    </main>
  );
}
