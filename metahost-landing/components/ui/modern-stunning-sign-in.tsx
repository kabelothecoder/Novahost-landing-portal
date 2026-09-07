"use client";

import { ReactNode, useState, FormEvent } from "react";
import { novaHost } from "@/lib/novahost";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

interface SignInProps {
  logo: ReactNode;
  title: string;
  subtitle: string;
  bottomText: string;
}

export function SignIn1({ logo, title, subtitle, bottomText }: SignInProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await novaHost.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push("/mentor/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid login credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/[0.02] border border-white/10 p-10 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
      {/* Internal glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-[50px] pointer-events-none" />
      
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
        {logo}
      </div>
      <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">{title}</h2>
      <p className="text-white/40 text-sm mb-8">{subtitle}</p>
      
      <form onSubmit={handleSignIn} className="w-full space-y-4 mb-8 text-left">
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <input 
            type="email" 
            placeholder="admin@novahost.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-white/20" 
          />
        </div>
        <div>
          <input 
            type="password" 
            placeholder="••••••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-white/20" 
          />
        </div>
        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl py-3.5 mt-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Accessing Portal..." : "Access Portal"}
        </button>
      </form>

      <div className="border-t border-white/10 pt-6 w-full">
        <p className="text-[11px] text-white/30 leading-relaxed">{bottomText}</p>
      </div>
    </div>
  );
}
