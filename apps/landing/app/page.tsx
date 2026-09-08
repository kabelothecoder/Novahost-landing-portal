"use client";

import React from "react";
import { PixelHero } from "@/components/ui/pixel-perfect-hero";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { MagneticText } from "@/components/ui/morphing-cursor";

// The mentor portal is served on this same domain under /mentor/* (a Vercel
// multi-zone rewrite in next.config.ts to the portal's own project). Trailing
// slash: that's the portal's base path.
const PORTAL_URL = "/mentor/";

// Signed Android release in the Supabase `downloads` bucket — same file the
// portal's own landing serves. Override with NEXT_PUBLIC_APK_URL in Vercel to
// move it without a code change.
const APK_URL =
  process.env.NEXT_PUBLIC_APK_URL ??
  "https://epulmnfbxjmaimefhofp.supabase.co/storage/v1/object/public/downloads/novahost.apk";

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
          window.location.href = APK_URL;
        }}
      />
    </main>
  );
}
