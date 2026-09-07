"use client";

import React from "react";
import { Box } from "lucide-react";
// Assuming SignIn1 is exported from modern-stunning-sign-in.tsx as requested
import { SignIn1 } from "@/components/ui/modern-stunning-sign-in";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <SignIn1 
        logo={<Box className="text-white w-6 h-6" />}
        title="NovaHost"
        subtitle="Sign in to your account"
        bottomText="Join the elite network of automated trading mentors running on NovaHost."
      />
    </main>
  );
}
