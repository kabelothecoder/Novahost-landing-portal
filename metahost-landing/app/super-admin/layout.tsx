"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, ShieldCheck, Users, DollarSign,
  Activity, LogOut, Terminal, Menu, X, ChevronRight
} from "lucide-react";

// ─── Mock Auth ────────────────────────────────────────────────────────────────
const ADMIN_CREDENTIALS = { email: "admin@novahost.com", password: "NovaHost@Admin2026!" };
const AUTH_KEY = "mh_super_admin_auth";

const AuthCtx = createContext<{
  authed: boolean;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}>({ authed: false, login: () => false, logout: () => {} });

function useAdminAuth() { return useContext(AuthCtx); }

// ─── Login Wall ───────────────────────────────────────────────────────────────
function LoginWall({ onLogin }: { onLogin: (e: string, p: string) => boolean }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise(r => setTimeout(r, 600));
    const ok = onLogin(email, pass);
    if (!ok) setError("Invalid credentials. Access denied.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/6 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-2xl shadow-indigo-600/30 mb-5">
            <Terminal size={28} className="text-white" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Restricted Access — Super Admins Only
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            NovaHost Command Center
          </h1>
          <p className="text-sm text-white/30 mt-1.5">
            Authorised personnel only. All access is logged and audited.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white/[0.03] border border-white/8 backdrop-blur-xl p-8 shadow-2xl shadow-black/60">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/40 tracking-wider uppercase mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@novahost.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 tracking-wider uppercase mb-2">
                Master Password
              </label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <ShieldCheck size={15} />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/25 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : "Enter Command Center"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-[11px] text-white/15">
              This portal has no public sign-up. Contact your system operator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "approvals", label: "Approval Queue", icon: ShieldCheck },
  { id: "mentors", label: "Mentor Matrix", icon: Users },
  { id: "revenue", label: "Revenue & Billing", icon: DollarSign },
  { id: "health", label: "System Health", icon: Activity },
];

function Sidebar({
  active, setActive, mobile, onClose
}: {
  active: string; setActive: (id: string) => void;
  mobile?: boolean; onClose?: () => void;
}) {
  const { logout } = useAdminAuth();
  return (
    <aside className={`${mobile ? "fixed inset-0 z-50" : "relative"} w-64 flex flex-col bg-[#08090f] border-r border-white/6 h-full`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Terminal size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-black text-white tracking-tight">NovaHost</p>
            <p className="text-[9px] text-red-400 font-bold tracking-widest uppercase">Super Admin</p>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Status indicator */}
      <div className="px-5 py-3 border-b border-white/4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400 font-semibold">All Systems Operational</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] text-white/20 tracking-widest uppercase font-bold px-3 mb-3">
          Command Modules
        </p>
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => { setActive(id); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-left group ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/25"
                  : "text-white/40 hover:text-white/80 hover:bg-white/4"
              }`}
            >
              <Icon size={16} className={isActive ? "text-indigo-400" : "text-white/30 group-hover:text-white/60"} />
              {label}
              {isActive && <ChevronRight size={13} className="ml-auto text-indigo-400" />}
              {id === "approvals" && (
                <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black">
                  3
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin identity + logout */}
      <div className="p-4 border-t border-white/6">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/3 border border-white/6 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-black">
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">Super Admin</p>
            <p className="text-[10px] text-white/30 truncate">admin@novahost.com</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/8 text-sm font-semibold transition-all"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function AdminShell({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#050508] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col">
        <Sidebar active={active} setActive={setActive} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <Sidebar active={active} setActive={setActive} mobile onClose={() => setMobileOpen(false)} />
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center gap-4 px-6 border-b border-white/6 bg-[#08090f]/80 backdrop-blur-xl shrink-0">
          <button className="lg:hidden text-white/50 hover:text-white" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white capitalize">
              {NAV.find(n => n.id === active)?.label ?? "Command Center"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/4 border border-white/8 text-[11px] text-white/40 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE
            </div>
            <div className="text-[11px] text-white/20 font-mono">
              {new Date().toLocaleDateString("en-ZA", { dateStyle: "medium" })}
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {/* Inject active section id via context */}
          <ActiveSectionContext.Provider value={active}>
            {children}
          </ActiveSectionContext.Provider>
        </main>
      </div>
    </div>
  );
}

export const ActiveSectionContext = createContext<string>("overview");
export function useActiveSection() { return useContext(ActiveSectionContext); }

// ─── Layout Default Export ────────────────────────────────────────────────────
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(AUTH_KEY) === "1");
  }, []);

  const login = (email: string, pass: string) => {
    const ok = email === ADMIN_CREDENTIALS.email && pass === ADMIN_CREDENTIALS.password;
    if (ok) { sessionStorage.setItem(AUTH_KEY, "1"); setAuthed(true); }
    return ok;
  };

  const logout = () => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); };

  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthCtx.Provider value={{ authed, login, logout }}>
      {authed ? (
        <AdminShell>{children}</AdminShell>
      ) : (
        <LoginWall onLogin={login} />
      )}
    </AuthCtx.Provider>
  );
}
