import { useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type ManualCost } from "@/lib/api";
import { date, monthLabel, relative } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * What the business spends.
 *
 * Currencies are never added together: every total, and the chart, is for one
 * currency at a time. "Estimate" means a provider's published rate times our
 * own connection hours, because that provider has no billing API.
 */

const fmt = (amount: number | null | undefined, currency: string | null | undefined) =>
  amount == null || !currency
    ? "—"
    : new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

const MODE_LABEL: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  live: { text: "Live billing API", variant: "default" },
  balance: { text: "Balance only", variant: "secondary" },
  manual: { text: "Manual", variant: "outline" },
  unconfigured: { text: "Not configured", variant: "outline" },
  error: { text: "API error", variant: "destructive" },
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Costs() {
  const { data, error, loading, reload } = useAsync(() => api.costs(), []);
  const { toast } = useToast();

  const entries = data?.entries ?? [];
  const currencies = useMemo(
    () => Array.from(new Set(entries.map((e) => e.currency))).sort(),
    [entries],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const currency = picked && currencies.includes(picked) ? picked : currencies.includes("USD") ? "USD" : currencies[0] ?? "USD";

  const { series, totals } = useMemo(() => {
    const byMonth = new Map<string, { live: number; estimate: number; manual: number }>();
    const totals = { live: 0, estimate: 0, manual: 0 };
    for (const e of entries) {
      if (e.currency !== currency) continue;
      const m = e.date.slice(0, 7);
      const row = byMonth.get(m) ?? { live: 0, estimate: 0, manual: 0 };
      row[e.source] += e.amount;
      totals[e.source] += e.amount;
      byMonth.set(m, row);
    }
    const series = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([m, r]) => ({
        month: monthLabel(m),
        live: +r.live.toFixed(2),
        estimate: +r.estimate.toFixed(2),
        manual: +r.manual.toFixed(2),
      }));
    return { series, totals };
  }, [entries, currency]);

  // ── Manual entry form ─────────────────────────────────────────────────────
  const [form, setForm] = useState({
    incurredOn: today(),
    provider: "",
    category: "infrastructure" as ManualCost["category"],
    description: "",
    amount: "",
    currency: "USD" as ManualCost["currency"],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    const amount = Number.parseFloat(form.amount);
    if (!form.provider.trim() || !(amount > 0)) {
      toast({ title: "Enter a provider and an amount above zero", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.createCost({ ...form, amount });
      toast({ title: "Cost saved" });
      setForm((f) => ({ ...f, description: "", amount: "" }));
      reload();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this cost entry?")) return;
    try {
      await api.deleteCost(id);
      reload();
    } catch (e) {
      toast({ title: "Could not delete", description: (e as Error).message, variant: "destructive" });
    }
  }

  if (error) return <LoadError error={error} onRetry={reload} />;

  const accounts = data?.accounts ?? [];
  const liveAccounts = accounts.filter((a) => !a.disconnectedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          Live where a provider has a billing API, an estimate where only a published rate exists, and
          manual everywhere else. Each currency is totalled on its own &mdash; nothing is converted.
        </p>
        <div className="flex items-center gap-2">
          {currencies.length > 1 && (
            <Select value={currency} onValueChange={setPicked}>
              <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat loading={loading} label={`Billed (live, ${currency})`} value={fmt(totals.live, currency)} />
        <Stat loading={loading} label={`Estimated (${currency})`} value={fmt(totals.estimate, currency)} hint="MetaRPC at published rate" tone={totals.estimate ? "warn" : "default"} />
        <Stat loading={loading} label={`Manual (${currency})`} value={fmt(totals.manual, currency)} />
        <Stat loading={loading} label="Live broker accounts" value={liveAccounts.length} hint={`${accounts.length} ever connected`} />
      </div>

      <Panel title={`Spend by month (${currency})`} description="Last 12 months with any cost, split by where the number came from.">
        {loading ? (
          <TableSkeleton rows={4} cols={1} />
        ) : series.length === 0 ? (
          <Empty title="No costs recorded" body="Configure a billing API below or add a manual entry." />
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-[11px]" stroke="currentColor" />
                <YAxis tickLine={false} axisLine={false} width={64} className="text-[11px]" stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(v: number, name: string) => [fmt(v, currency), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="live" name="Live" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="estimate" name="Estimate" stackId="a" fill="hsl(var(--warning))" />
                <Bar dataKey="manual" name="Manual" stackId="a" fill="hsl(var(--muted-foreground))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title="Providers" description="Which numbers are real billing data and which you have to enter.">
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.providers ?? []).map((p) => (
                <TableRow key={p.provider}>
                  <TableCell className="font-medium">{p.provider}</TableCell>
                  <TableCell>
                    <Badge variant={MODE_LABEL[p.mode].variant} className="whitespace-nowrap font-normal">
                      {MODE_LABEL[p.mode].text}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(p.balance?.amount, p.balance?.currency)}</TableCell>
                  <TableCell className="max-w-[48ch] text-[12.5px] text-muted-foreground">{p.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel
        title="Broker accounts"
        description="Every account linked through MetaRPC. Balance is the trader's broker balance, read live. Cost is an estimate at MetaRPC's published rate."
      >
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : !accounts.length ? (
          <Empty title="No broker accounts linked" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Bridge</TableHead>
                  <TableHead>Licence</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead className="text-right">Live for</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id} className={a.disconnectedAt ? "opacity-60" : undefined}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{a.login} · {a.platform}</div>
                      <div className="text-[12px] text-muted-foreground">{a.server}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">MetaRPC</Badge>
                      {a.disconnectedAt && <div className="mt-1 text-[11px] text-muted-foreground">ended {date(a.disconnectedAt)}</div>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-[12px] text-muted-foreground">
                      {a.licenseKey ?? "—"}
                      {a.ownerEmail && <div className="truncate font-sans">{a.ownerEmail}</div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground" title={a.connectedAt}>
                      {date(a.connectedAt)}
                      <div className="text-[11px]">{relative(a.connectedAt)}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.liveHours >= 48 ? `${Math.round(a.liveHours / 24)} d` : `${a.liveHours} h`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.balance?.error ? (
                        <span className="text-[12px] text-muted-foreground" title={a.balance.error}>unavailable</span>
                      ) : (
                        fmt(a.balance?.amount, a.balance?.currency)
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.cost ? (
                        <>
                          {fmt(a.cost.amount, a.cost.currency)}
                          <div className="text-[11px] text-muted-foreground">estimate</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Panel title="Cost by mentor" description="MetaRPC terminal cost of each mentor's students' accounts, at the published rate (estimate, USD).">
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : !data?.mentors.length ? (
          <Empty title="No broker accounts linked" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentor</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Live now</TableHead>
                <TableHead className="text-right">Terminal hours</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.mentors.map((m) => (
                <TableRow key={m.mentorId ?? "none"}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.accounts}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.live}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.hours.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(m.costUsd, "USD")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel title="Add a cost" description="For Supabase, Resend, Gemini, MetaRPC top-ups, or anything else without a billing API.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label htmlFor="c-date">Date</Label>
            <Input id="c-date" type="date" value={form.incurredOn} onChange={(e) => setForm({ ...form, incurredOn: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-prov">Provider</Label>
            <Input id="c-prov" list="c-prov-list" value={form.provider} maxLength={60} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
            <datalist id="c-prov-list">
              {["Supabase", "Vercel", "Resend", "Gemini", "Fish Audio", "MetaRPC"].map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ManualCost["category"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
                <SelectItem value="bridge">Broker bridge</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-amt">Amount</Label>
            <Input id="c-amt" type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as ManualCost["currency"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="ZAR">ZAR</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-6">
            <Label htmlFor="c-desc">Description</Label>
            <Input id="c-desc" value={form.description} maxLength={500} placeholder="e.g. Pro plan, October" onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save cost"}</Button>
        </div>
      </Panel>

      <Panel title="Manual entries" description={`${data?.manual.length ?? 0} recorded.`}>
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : !data?.manual.length ? (
          <Empty title="No manual entries yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.manual.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{date(m.incurredOn)}</TableCell>
                  <TableCell className="font-medium">{m.provider}</TableCell>
                  <TableCell className="max-w-[40ch] truncate text-muted-foreground">{m.description || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(m.amount, m.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => remove(m.id)} aria-label="Delete entry">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
