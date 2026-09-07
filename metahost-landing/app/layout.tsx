import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NovaHost — Automated Luxury Trading Platform",
  description:
    "Effortlessly connect your Expert Advisors to our ultra-low latency mobile VPS. Run 24/7 automated trading strategies directly from your mobile device.",
  keywords: ["NovaHost", "algorithmic trading", "Expert Advisors", "VPS", "MT4", "MT5", "mobile trading"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-[#060609] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
