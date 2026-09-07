import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout, Palette, ShieldAlert, Sparkles, CreditCard, ChevronRight, Laptop, ArrowRight } from "lucide-react";

/**
 * @description WebBuilder page displaying a premium, blurred drag-and-drop website/landing page builder preview
 * covered with an elegant "Coming Soon" overlay to highlight monetization pivoting.
 */
export default function WebBuilder() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm p-6 sm:p-8 flex flex-col justify-between animate-fade-in">
      
      {/* Blurred Dashboard Content */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 blur-[8px] pointer-events-none select-none opacity-40">
        {/* Left Toolbar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="glass-card border-white/10">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <Layout className="w-4 h-4 text-primary" /> Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {["Hero Banner", "Features Grid", "Pricing Cards", "FAQ Accordion", "Contact Footer"].map((s, idx) => (
                <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs flex items-center justify-between text-muted-foreground">
                  {s} <ChevronRight className="w-3 h-3" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <Palette className="w-4 h-4 text-secondary" /> Theme & Design
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <span className="w-6 h-6 rounded-full bg-primary" />
                <span className="w-6 h-6 rounded-full bg-secondary" />
                <span className="w-6 h-6 rounded-full bg-accent" />
              </div>
              <div className="h-2 w-full bg-white/10 rounded" />
              <div className="h-2 w-3/4 bg-white/10 rounded" />
            </CardContent>
          </Card>
        </div>

        {/* Central Canvas Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden flex flex-col min-h-[400px]">
            {/* Mock Landing Page Browser Bar */}
            <div className="h-10 border-b border-white/5 bg-white/5 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <div className="text-[10px] text-muted-foreground font-mono bg-black/35 px-4 py-0.5 rounded-md border border-white/5">
                my-awesome-ea-sales.novahost.co
              </div>
              <Laptop className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Mock Website Page Canvas */}
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <Badge className="bg-primary/20 text-primary border-primary/30">Next-Gen Expert Advisor</Badge>
              <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                Automate Your Trading Journey
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Deploy the world's most optimized SMC and grid strategies directly onto your MetaTrader account with zero setup latency.
              </p>
              
              {/* Payment Checkout Mock Card */}
              <div className="max-w-xs w-full bg-gradient-to-br from-card to-black p-5 rounded-2xl border border-white/10 shadow-2xl space-y-4">
                <div className="flex justify-between items-center text-white">
                  <span className="font-semibold text-xs text-muted-foreground">Standard Lifetime Plan</span>
                  <span className="font-bold text-sm">$499</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Stripe Integration Ready</span>
                </div>
                <Button className="w-full text-xs h-9 bg-primary text-white">Unlock Bot Access</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="glass-card border-white/10">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <CreditCard className="w-4 h-4 text-primary" /> Gateway Config
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <div className="h-2 w-12 bg-white/20 rounded" />
                <div className="h-8 w-full bg-white/5 rounded border border-white/5" />
              </div>
              <div className="space-y-1">
                <div className="h-2 w-20 bg-white/20 rounded" />
                <div className="h-8 w-full bg-white/5 rounded border border-white/5" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/20 border border-emerald-500/30 rounded" />
                <div className="h-2 w-24 bg-white/20 rounded" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Premium COMING SOON Banner Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-radial-gradient">
        <div className="relative z-10 max-w-md w-full p-8 text-center glass-card border border-white/15 dark:border-white/10 shadow-[0_0_80px_rgba(59,130,246,0.25)] rounded-3xl space-y-6 transform hover:scale-[1.01] transition-all duration-500">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 relative">
            <Sparkles className="w-8 h-8 text-primary-foreground animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              Feature Expansion
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl mt-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              Website Builder
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Create gorgeous, high-converting checkout landing pages for your Expert Advisors in minutes. Direct Stripe integration and instant license provisioning.
            </p>
          </div>

          <div className="pt-2">
            <div className="relative group inline-block">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-cyan-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <Button className="relative bg-black text-white hover:bg-black/90 border border-white/10 px-6 py-5 rounded-xl flex items-center gap-2 text-xs font-mono uppercase tracking-widest transition-transform group-hover:scale-102">
                Coming Soon <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
