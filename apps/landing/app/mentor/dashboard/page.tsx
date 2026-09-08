"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { novaHost } from "@/lib/novahost";
import { Target, Users, TrendingUp, LogOut, User } from "lucide-react";
import { User as NovaHostUser } from "@supabase/supabase-js";

export default function MentorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<NovaHostUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await novaHost.auth.getSession();
      if (!session) {
        router.push("/auth/login");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    }
    getSession();

    const { data: { subscription } } = novaHost.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/auth/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await novaHost.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060609] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  const currentLicenses = 84;
  const targetLicenses = 100;
  const progressPercent = Math.min((currentLicenses / targetLicenses) * 100, 100);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-[#060609] min-h-screen text-white">
      {/* Header bar with user profile info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mentor Dashboard</h1>
          <p className="text-white/40 text-xs mt-1 font-mono">Session ID: {user?.id}</p>
        </div>
        <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            <User size={16} className="text-indigo-400" />
            <span className="text-sm text-white/80">{user?.email}</span>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors duration-200"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
      
      {/* The Partner Deal Matrix */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-sm p-6 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="text-indigo-400" size={24} />
              The Partner Deal Matrix
            </h2>
            <p className="text-white/40 text-sm mt-1">
              Track your user acquisition milestones and unlock premium rebate tiers.
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
            <TrendingUp size={14} />
            Tier 2 Active
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-5 border border-white/5 relative z-10">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-indigo-300 font-bold text-sm mb-1">Qualify for an Extra 5% Payout Cut</p>
              <p className="text-white/60 text-xs max-w-lg leading-relaxed">
                Bring in your specified target community license volume to automatically increase your broker rebate processing split by a premium 5% bonus layer.
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white">{currentLicenses} <span className="text-sm text-white/40 font-normal">/ {targetLicenses}</span></p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Active Licenses</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden mt-4 relative">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/40 mt-2 font-mono">
            <span>0</span>
            <span>{targetLicenses}</span>
          </div>
        </div>
      </div>
      
      {/* Other dashboard content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-6 h-40 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Users size={20} className="text-white/50" />
            </div>
            <span className="text-xs font-bold text-emerald-400">+12%</span>
          </div>
          <div>
            <p className="text-3xl font-black">342</p>
            <p className="text-xs text-white/30">Total Community Size</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-6 h-40 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <TrendingUp size={20} className="text-white/50" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black">$4,250</p>
            <p className="text-xs text-white/30">Pending Payout</p>
          </div>
        </div>
      </div>
    </div>
  );
}
