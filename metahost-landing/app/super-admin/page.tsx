"use client";

import { useState, useMemo } from "react";
import { useActiveSection } from "./layout";
import { novaHost } from "@/lib/novahost";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Users, ShieldCheck,
  Bot, Search, ExternalLink, CheckCircle, XCircle, Clock,
  AlertTriangle, Server, Cpu, HardDrive, Wifi, Globe,
  ArrowUpRight, ArrowDownRight, RefreshCw, Eye, Filter,
  ChevronUp, ChevronDown, ChevronsUpDown, Zap
} from "lucide-react";

// ─── Shared Primitives ────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" }) {
  const styles = {
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    red: "bg-red-500/15 text-red-400 border-red-500/20",
    yellow: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    blue: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    gray: "bg-white/5 text-white/40 border-white/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles[color]}`}>
      {children}
    </span>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-white/35 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const revenueData = [
  { day: "Jun 1", mrr: 4200, subs: 12 }, { day: "Jun 3", mrr: 4800, subs: 14 },
  { day: "Jun 5", mrr: 5100, subs: 15 }, { day: "Jun 7", mrr: 4900, subs: 14 },
  { day: "Jun 9", mrr: 5800, subs: 17 }, { day: "Jun 11", mrr: 6200, subs: 18 },
  { day: "Jun 13", mrr: 6700, subs: 19 }, { day: "Jun 15", mrr: 7100, subs: 21 },
  { day: "Jun 17", mrr: 7400, subs: 22 }, { day: "Jun 19", mrr: 8200, subs: 24 },
  { day: "Jun 21", mrr: 8800, subs: 26 }, { day: "Jun 23", mrr: 9100, subs: 27 },
  { day: "Jun 25", mrr: 9400, subs: 28 }, { day: "Jun 27", mrr: 9900, subs: 29 },
  { day: "Jun 30", mrr: 10340, subs: 31 },
];

const pendingMentors = [
  { id: "m1", date: "2026-06-15", name: "Kabelo Mokoena", email: "kabelo@nexttrade.co.za", community: "~340", status: "pending" },
  { id: "m2", date: "2026-06-16", name: "Aisha Nkosi", email: "aisha@smcpro.africa", community: "~120", status: "pending" },
  { id: "m3", date: "2026-06-17", name: "Tebogo Sithole", email: "tebogo@pipsociety.com", community: "~80", status: "pending" },
  { id: "m4", date: "2026-06-12", name: "Samuel Osei", email: "s.osei@goldmarkets.gh", community: "~250", status: "reviewing" },
  { id: "m5", date: "2026-06-10", name: "Naledi Dlamini", email: "naledi@eliteea.co.za", community: "~400", status: "reviewing" },
];

const mentorProfiles = [
  { id: "a1", name: "Kabelo Mokoena", email: "kabelo@nexttrade.co.za", users: 338, licenses: 14, revenue: "$1,190", joined: "2026-01-10", status: "active", plan: "Quarterly" },
  { id: "a2", name: "Aisha Nkosi", email: "aisha@smcpro.africa", users: 118, licenses: 8, revenue: "$679.92", joined: "2026-02-03", status: "active", plan: "Monthly" },
  { id: "a3", name: "Tebogo Sithole", email: "tebogo@pipsociety.com", users: 79, licenses: 5, revenue: "$169.95", joined: "2026-03-21", status: "active", plan: "Monthly" },
  { id: "a4", name: "Samuel Osei", email: "s.osei@goldmarkets.gh", users: 248, licenses: 18, revenue: "$6,299.82", joined: "2025-11-14", status: "active", plan: "Lifetime" },
  { id: "a5", name: "Naledi Dlamini", email: "naledi@eliteea.co.za", users: 397, licenses: 29, revenue: "$2,317.71", joined: "2026-01-05", status: "active", plan: "Quarterly" },
  { id: "a6", name: "Kwame Acheampong", email: "kwame@forexmastery.gh", users: 56, licenses: 3, revenue: "$101.97", joined: "2026-05-18", status: "suspended", plan: "Monthly" },
  { id: "a7", name: "Zanele Khumalo", email: "zanele@tradezim.com", users: 203, licenses: 16, revenue: "$1,279.84", joined: "2025-12-20", status: "active", plan: "Quarterly" },
  { id: "a8", name: "Emeka Okafor", email: "emeka@ngtrader.ng", users: 441, licenses: 31, revenue: "$10,534.69", joined: "2025-09-08", status: "active", plan: "Lifetime" },
];

const serverNodes = [
  { region: "London NY4", latency: "0.3ms", cpu: 24, ram: 41, status: "healthy", eas: 124 },
  { region: "Tokyo TY3", latency: "0.6ms", cpu: 51, ram: 58, status: "healthy", eas: 89 },
  { region: "Singapore SG1", latency: "0.4ms", cpu: 38, ram: 47, status: "healthy", eas: 106 },
  { region: "Dubai DXB", latency: "0.8ms", cpu: 67, ram: 72, status: "warning", eas: 71 },
  { region: "Sydney SYD", latency: "1.1ms", cpu: 19, ram: 33, status: "healthy", eas: 48 },
  { region: "São Paulo", latency: "1.4ms", cpu: 11, ram: 28, status: "healthy", eas: 37 },
];

const billingData = [
  { month: "Jan", monthly: 2800, quarterly: 4200, lifetime: 1400 },
  { month: "Feb", monthly: 3100, quarterly: 4800, lifetime: 2100 },
  { month: "Mar", monthly: 3400, quarterly: 5200, lifetime: 700 },
  { month: "Apr", monthly: 3900, quarterly: 5800, lifetime: 3500 },
  { month: "May", monthly: 4200, quarterly: 6400, lifetime: 1050 },
  { month: "Jun", monthly: 4800, quarterly: 7100, lifetime: 4900 },
];

// ─── Tooltip customization ────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0e1018] border border-white/12 px-4 py-3 text-xs shadow-2xl">
      <p className="text-white/40 mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60 capitalize">{p.dataKey}:</span>
          <span className="text-white font-bold">{typeof p.value === "number" && p.dataKey.includes("mrr") ? `$${p.value.toLocaleString()}` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── SECTION: Overview ────────────────────────────────────────────────────────
function OverviewSection() {
  const metrics = [
    {
      label: "Monthly Recurring Revenue",
      value: "$10,340",
      change: "+18.4%",
      up: true,
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      sub: "vs. last month"
    },
    {
      label: "Pending Approvals",
      value: "3",
      change: "Requires Action",
      up: false,
      urgent: true,
      icon: ShieldCheck,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      sub: "2 reviewing"
    },
    {
      label: "Active Mentors",
      value: "31",
      change: "+4 this month",
      up: true,
      icon: Users,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      sub: "7 regions"
    },
    {
      label: "Active Robot Licenses",
      value: "314",
      change: "+29 this week",
      up: true,
      icon: Bot,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      sub: "across all EAs"
    },
  ];

  return (
    <div className="p-7">
      <SectionHeader
        title="Command Overview"
        subtitle="Live platform metrics — updated every 60 seconds"
        action={
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/8 text-xs text-white/50 hover:text-white hover:border-white/20 transition-all">
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className={`p-5 border ${m.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center border ${m.border}`}>
                  <Icon size={18} className={m.color} />
                </div>
                {m.urgent ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 text-[10px] font-black animate-pulse">
                    <AlertTriangle size={9} />
                    URGENT
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 text-xs font-bold ${m.up ? "text-emerald-400" : "text-red-400"}`}>
                    {m.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {m.change}
                  </span>
                )}
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight mb-0.5">{m.value}</p>
              <p className="text-xs text-white/30 font-medium">{m.label}</p>
              <p className="text-[11px] text-white/20 mt-1">{m.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* Revenue area chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-white">Revenue Growth</h3>
            <p className="text-xs text-white/30 mt-0.5">MRR over the last 30 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-white/40">MRR</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-white/40">Subscribers</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="subsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2} fill="url(#mrrGrad)" dot={false} />
            <Area type="monotone" dataKey="subs" stroke="#10b981" strokeWidth={2} fill="url(#subsGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {[
          { label: "Avg Rev / Mentor", value: "$333.55", delta: "+$12 vs last mo" },
          { label: "License Activation Rate", value: "91.4%", delta: "of issued keys active" },
          { label: "Churn Rate (MTD)", value: "2.1%", delta: "↓ from 3.8% last mo" },
          { label: "Trial → Paid Conv.", value: "68.3%", delta: "Industry avg: 45%" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xl font-extrabold text-white">{s.value}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-emerald-400/70 mt-1">{s.delta}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION: Approval Queue ──────────────────────────────────────────────────
function ApprovalsSection() {
  const [rows, setRows] = useState(pendingMentors);
  const [actioned, setActioned] = useState<Record<string, "approved" | "rejected">>({});

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setActioned(prev => ({ ...prev, [id]: action }));
    
    const status = action === "approved" ? "active" : "rejected";
    const { error } = await novaHost
      .from("profiles")
      .update({ status })
      .eq("id", id);
      
    if (error) {
      console.error("Failed to update mentor status:", error);
    }
  };

  return (
    <div className="p-7">
      <SectionHeader
        title="Mentor Approval Queue"
        subtitle="Every mentor must be manually approved before their portal unlocks. No exceptions."
        action={
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            <AlertTriangle size={13} />
            {rows.filter(r => !actioned[r.id]).length} Pending
          </div>
        }
      />

      {/* Warning banner */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-500/8 border border-amber-500/20 mb-6">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80 leading-relaxed">
          <span className="font-bold text-amber-300">Gatekeeper Protocol Active.</span>{" "}
          Approving a mentor grants immediate access to the Mentor Portal, license generation, and client management tools.
          Rejection triggers an automated denial email. All decisions are logged.
        </p>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6">
                {["Date Applied", "Mentor Name", "Email", "Expected Community", "Status", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-white/30 tracking-widest uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const done = actioned[r.id];
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-white/4 transition-all ${done ? "opacity-40" : "hover:bg-white/[0.015]"}`}
                  >
                    <td className="px-5 py-4 text-xs text-white/40 font-mono">{r.date}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                          {r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-semibold text-white text-xs">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-indigo-400 font-mono">{r.email}</td>
                    <td className="px-5 py-4">
                      <Badge color="blue">{r.community} members</Badge>
                    </td>
                    <td className="px-5 py-4">
                      {done ? (
                        <Badge color={done === "approved" ? "green" : "red"}>
                          {done === "approved" ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {done}
                        </Badge>
                      ) : (
                        <Badge color={r.status === "reviewing" ? "yellow" : "gray"}>
                          <Clock size={10} />
                          {r.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {!done ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(r.id, "approved")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 transition-all"
                          >
                            <CheckCircle size={12} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(r.id, "rejected")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold hover:bg-red-500/25 transition-all"
                          >
                            <XCircle size={12} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-white/20 italic">Decision recorded</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── SECTION: Mentor Matrix ───────────────────────────────────────────────────
function MentorMatrixSection() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<typeof mentorProfiles[0] | null>(null);
  const [sortCol, setSortCol] = useState<"revenue" | "licenses" | "users">("revenue");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return mentorProfiles
      .filter(m => !q || m.email.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aVal = sortCol === "revenue"
          ? parseFloat(a.revenue.replace(/[$,]/g, ""))
          : a[sortCol];
        const bVal = sortCol === "revenue"
          ? parseFloat(b.revenue.replace(/[$,]/g, ""))
          : b[sortCol];
        return sortDir === "desc"
          ? (bVal as number) - (aVal as number)
          : (aVal as number) - (bVal as number);
      });
  }, [query, sortCol, sortDir]);

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) =>
    sortCol === col
      ? sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />
      : <ChevronsUpDown size={11} className="opacity-30" />;

  return (
    <div className="p-7">
      <SectionHeader
        title="Mentor Matrix"
        subtitle="God Mode — search any mentor by email and open their portal as them"
      />

      {/* ── Global Lookup ── */}
      <Card className="p-5 mb-6 border border-indigo-500/20">
        <p className="text-xs font-bold text-indigo-400 tracking-widest uppercase mb-3 flex items-center gap-2">
          <Eye size={13} />
          God Mode — Global Lookup
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null); }}
              placeholder="Insert email or mentor name to open their world…"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15 transition-all font-mono"
            />
          </div>
          <button
            onClick={() => { if (filtered.length) setSelected(filtered[0]); }}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            Search
          </button>
        </div>

        {/* ── Impersonation panel ── */}
        {selected && (
          <div className="mt-5 pt-5 border-t border-white/6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Mentor", value: selected.name, sub: selected.email, icon: Users },
                { label: "Active Users", value: selected.users.toLocaleString(), sub: "under this mentor", icon: Users },
                { label: "Licenses Generated", value: selected.licenses.toString(), sub: "active keys", icon: Bot },
                { label: "Revenue Contributed", value: selected.revenue, sub: `${selected.plan} plan`, icon: DollarSign },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/8 p-4">
                    <p className="text-xs text-white/30 mb-1">{s.label}</p>
                    <p className="text-lg font-extrabold text-white">{s.value}</p>
                    <p className="text-[11px] text-white/20">{s.sub}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 group">
                <ExternalLink size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                View Portal / Impersonate
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-black">
                  ADMIN ONLY
                </span>
              </button>
              <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/4 border border-white/10 text-white/60 text-sm font-semibold hover:text-white hover:border-white/20 transition-all">
                <ShieldCheck size={15} />
                Audit Log
              </button>
              <button 
                onClick={async () => {
                  const { error } = await novaHost
                    .from("profiles")
                    .update({ status: "suspended" })
                    .eq("id", selected.id);
                  if (error) {
                    console.error("Failed to suspend mentor:", error);
                  } else {
                    alert("Mentor suspended successfully");
                  }
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all">
                <XCircle size={15} />
                Suspend Mentor
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Full mentor table ── */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
          <p className="text-xs font-bold text-white/50 uppercase tracking-widest">All Active Mentors ({mentorProfiles.length})</p>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <Filter size={12} />
            Sort by:
            {(["revenue", "licenses", "users"] as const).map(col => (
              <button
                key={col}
                onClick={() => toggleSort(col)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${sortCol === col ? "bg-indigo-500/20 text-indigo-300" : "hover:bg-white/5"}`}
              >
                {col} <SortIcon col={col} />
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/4">
                {["Mentor", "Email", "Users", "Licenses", "Revenue", "Plan", "Status", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-white/25 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={`border-b border-white/4 cursor-pointer transition-all ${selected?.id === m.id ? "bg-indigo-500/8" : "hover:bg-white/[0.015]"}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                        {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{m.name}</p>
                        <p className="text-[10px] text-white/30">Since {m.joined}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-indigo-400 font-mono">{m.email}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-white">{m.users.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-violet-300">{m.licenses}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-emerald-300">{m.revenue}</td>
                  <td className="px-5 py-3.5"><Badge color="blue">{m.plan}</Badge></td>
                  <td className="px-5 py-3.5">
                    <Badge color={m.status === "active" ? "green" : "red"}>{m.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(m); }}
                      className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-indigo-400 transition-all"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── SECTION: Revenue & Billing ───────────────────────────────────────────────
function RevenueSection() {
  return (
    <div className="p-7">
      <SectionHeader
        title="Revenue & Billing"
        subtitle="Subscription breakdown and cohort revenue performance"
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total ARR", value: "$124,080", trend: "+22.1% YoY", up: true },
          { label: "Avg ARPU", value: "$333.55", trend: "+$12 vs last mo", up: true },
          { label: "Refund Rate", value: "0.8%", trend: "↓ from 1.3%", up: true },
        ].map(s => (
          <Card key={s.label} className="p-5">
            <p className="text-xs text-white/30 mb-2">{s.label}</p>
            <p className="text-3xl font-extrabold text-white">{s.value}</p>
            <p className="text-xs text-emerald-400 mt-1">{s.trend}</p>
          </Card>
        ))}
      </div>

      {/* Stacked bar chart */}
      <Card className="p-6 mb-6">
        <h3 className="text-sm font-bold text-white mb-1">Revenue by Plan Type</h3>
        <p className="text-xs text-white/30 mb-5">Monthly, Quarterly, and Lifetime cohort contributions</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={billingData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="monthly" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
            <Bar dataKey="quarterly" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="lifetime" stackId="a" fill="#ec4899" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-5 mt-3 text-xs">
          {[["#6366f1", "Monthly"], ["#8b5cf6", "Quarterly"], ["#ec4899", "Lifetime"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              <span className="text-white/35">{l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Top earner table */}
      <Card>
        <div className="px-5 py-4 border-b border-white/6">
          <h3 className="text-sm font-bold text-white">Top Revenue Contributors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/4">
                {["#", "Mentor", "Plan", "Licenses", "Revenue", "Share"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-white/25 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...mentorProfiles]
                .sort((a, b) => parseFloat(b.revenue.replace(/[$,]/g, "")) - parseFloat(a.revenue.replace(/[$,]/g, "")))
                .slice(0, 5)
                .map((m, i) => {
                  const total = mentorProfiles.reduce((s, x) => s + parseFloat(x.revenue.replace(/[$,]/g, "")), 0);
                  const share = ((parseFloat(m.revenue.replace(/[$,]/g, "")) / total) * 100).toFixed(1);
                  return (
                    <tr key={m.id} className="border-b border-white/4 hover:bg-white/[0.015] transition-all">
                      <td className="px-5 py-3.5 text-xs font-black text-white/20">#{i + 1}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-white">{m.name}</td>
                      <td className="px-5 py-3.5"><Badge color={m.plan === "Lifetime" ? "gray" : "blue"}>{m.plan}</Badge></td>
                      <td className="px-5 py-3.5 text-xs text-white/60">{m.licenses}</td>
                      <td className="px-5 py-3.5 text-xs font-black text-emerald-300">{m.revenue}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/6 max-w-[80px]">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-[11px] text-white/30">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── SECTION: System Health ───────────────────────────────────────────────────
function SystemHealthSection() {
  const getStatusColor = (s: string) =>
    s === "healthy" ? "green" : s === "warning" ? "yellow" : "red";

  return (
    <div className="p-7">
      <SectionHeader
        title="System Health"
        subtitle="Real-time VPS node telemetry across all global points-of-presence"
        action={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              5 / 6 Nodes Healthy
            </span>
          </div>
        }
      />

      {/* Global health grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {serverNodes.map((node) => {
          const cpuRisk = node.cpu > 80 ? "red" : node.cpu > 60 ? "yellow" : "green";
          const ramRisk = node.ram > 80 ? "red" : node.ram > 60 ? "yellow" : "green";
          return (
            <Card key={node.region} className={`p-5 border ${node.status === "warning" ? "border-amber-500/25 bg-amber-500/4" : "border-white/8"}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={14} className="text-white/30" />
                    <h3 className="text-sm font-bold text-white">{node.region}</h3>
                  </div>
                  <Badge color={getStatusColor(node.status) as any}>
                    {node.status === "healthy" ? <Zap size={9} /> : <AlertTriangle size={9} />}
                    {node.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/25 mb-0.5">Latency</p>
                  <p className="text-base font-black text-white font-mono">{node.latency}</p>
                </div>
              </div>

              {/* CPU bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-white/30 flex items-center gap-1"><Cpu size={10} /> CPU</span>
                  <span className={`font-bold ${cpuRisk === "red" ? "text-red-400" : cpuRisk === "yellow" ? "text-amber-400" : "text-emerald-400"}`}>{node.cpu}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/6">
                  <div
                    className={`h-full rounded-full transition-all ${cpuRisk === "red" ? "bg-red-500" : cpuRisk === "yellow" ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${node.cpu}%` }}
                  />
                </div>
              </div>

              {/* RAM bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-white/30 flex items-center gap-1"><HardDrive size={10} /> RAM</span>
                  <span className={`font-bold ${ramRisk === "red" ? "text-red-400" : ramRisk === "yellow" ? "text-amber-400" : "text-emerald-400"}`}>{node.ram}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/6">
                  <div
                    className={`h-full rounded-full transition-all ${ramRisk === "red" ? "bg-red-500" : ramRisk === "yellow" ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${node.ram}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                  <Bot size={11} />
                  {node.eas} EAs running
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                  <Wifi size={11} />
                  Connected
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Latency trend chart */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-1">Platform-Wide Uptime & Latency (30d)</h3>
        <p className="text-xs text-white/30 mb-5">All nodes combined average</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueData.map(d => ({ ...d, latency: +(Math.random() * 0.5 + 0.3).toFixed(2), uptime: 99.9 }))}
            margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── Page Router (driven by layout's ActiveSectionContext) ────────────────────
export default function SuperAdminPage() {
  const active = useActiveSection();

  const sections: Record<string, React.ReactNode> = {
    overview: <OverviewSection />,
    approvals: <ApprovalsSection />,
    mentors: <MentorMatrixSection />,
    revenue: <RevenueSection />,
    health: <SystemHealthSection />,
  };

  return sections[active] ?? <OverviewSection />;
}
