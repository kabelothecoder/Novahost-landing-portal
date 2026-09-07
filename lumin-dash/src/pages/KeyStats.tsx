import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { novaHost } from "@/integrations/novahost/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/*
 * Every figure on this page is counted from the mentor's own rows.
 *
 * It previously rendered four tiles whose values were the literal string "—"
 * with a "0%" change, and two charts fed from `const activationData = []` and
 * `const planDistributionData = []`, behind a two-second setTimeout pretending
 * to load. Nothing on the page ever touched the database.
 *
 * Two of the original tiles are gone rather than filled in. "Revenue This
 * Month" and "Churn Rate" cannot be computed honestly here: `plans` carries no
 * price and `subscriptions` no amount, because mentors issue licences while the
 * PayFast products are NovaHost's own revenue, not theirs. Churn needs a
 * history of status transitions that is not recorded. Inventing either is what
 * the page was already doing.
 */

const MONTHS_SHOWN = 6;

interface Totals {
  keysIssued: number;
  activeLicenses: number;
  devicesLinked: number;
  signalsSent: number;
}

interface Bucket {
  month: string;
  activations: number;
}

interface PlanSlice {
  name: string;
  count: number;
}

type Status = "loading" | "ready" | "error";

function emptyBuckets(): Bucket[] {
  const now = new Date();
  return Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1 - i), 1);
    return { month: d.toLocaleString("en", { month: "short" }), activations: 0 };
  });
}

const nf = new Intl.NumberFormat("en-ZA");

export default function KeyStats() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [activations, setActivations] = useState<Bucket[]>([]);
  const [plans, setPlans] = useState<PlanSlice[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [{ data: licences, error: licErr }, { data: planRows }, { data: eas }] =
          await Promise.all([
            novaHost
              .from("licenses")
              .select("id, status, created_at, plan_id")
              .eq("user_id", user!.id),
            novaHost.from("plans").select("id, name"),
            novaHost.from("expert_advisors").select("id").eq("user_id", user!.id),
          ]);

        if (licErr) throw licErr;
        if (cancelled) return;

        const rows = licences ?? [];
        const licenceIds = rows.map((r) => r.id);
        const eaIds = (eas ?? []).map((e) => e.id);

        // Counts that need a second round trip. Each guards its own empty list
        // first, because `.in()` with no values matches every row rather than
        // none — a mentor with no robots would otherwise be shown the whole
        // platform's signal count. Wrapped so each resolves to a plain number:
        // mixing a query builder and a literal in one Promise.all produces a
        // union deep enough to defeat the checker.
        const countDevices = async () => {
          if (licenceIds.length === 0) return 0;
          const { count } = await novaHost
            .from("device_activations")
            .select("*", { count: "exact", head: true })
            .in("license_id", licenceIds);
          return count ?? 0;
        };

        const countSignals = async () => {
          if (eaIds.length === 0) return 0;
          const { count } = await novaHost
            .from("signals")
            .select("*", { count: "exact", head: true })
            .in("ea_id", eaIds);
          return count ?? 0;
        };

        const [devicesLinked, signalsSent] = await Promise.all([countDevices(), countSignals()]);

        if (cancelled) return;

        setTotals({
          keysIssued: rows.length,
          activeLicenses: rows.filter((r) => r.status?.toLowerCase() === "active").length,
          devicesLinked,
          signalsSent,
        });

        // Activations by month
        const buckets = emptyBuckets();
        const index = new Map(buckets.map((b, i) => [b.month, i]));
        const since = new Date();
        since.setMonth(since.getMonth() - (MONTHS_SHOWN - 1));
        since.setDate(1);
        since.setHours(0, 0, 0, 0);

        for (const row of rows) {
          const created = new Date(row.created_at);
          if (created < since) continue;
          const i = index.get(created.toLocaleString("en", { month: "short" }));
          if (i !== undefined) buckets[i].activations += 1;
        }
        setActivations(buckets);

        // Plan distribution
        const planName = new Map((planRows ?? []).map((p) => [p.id, p.name]));
        const tally = new Map<string, number>();
        for (const row of rows) {
          const name = planName.get(row.plan_id) ?? "Unassigned";
          tally.set(name, (tally.get(name) ?? 0) + 1);
        }
        setPlans(
          Array.from(tally, ([name, count]) => ({ name, count })).sort(
            (a, b) => b.count - a.count,
          ),
        );

        setStatus("ready");
      } catch (e) {
        console.error("Failed to load key stats:", e);
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tiles = useMemo(
    () => [
      { label: "Keys issued", value: totals?.keysIssued },
      { label: "Active licences", value: totals?.activeLicenses },
      { label: "Devices linked", value: totals?.devicesLinked },
      { label: "Signals sent", value: totals?.signalsSent },
    ],
    [totals],
  );

  const totalActivations = activations.reduce((s, b) => s + b.activations, 0);
  const totalPlanned = plans.reduce((s, p) => s + p.count, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-card px-5 py-4">
            <p className="section-label">{tile.label}</p>
            {status === "loading" ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p
                className={cn(
                  "tabular mt-1.5 text-2xl font-semibold",
                  status === "error" && "text-muted-foreground",
                )}
              >
                {status === "error" ? "—" : nf.format(tile.value ?? 0)}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-baseline justify-between space-y-0 border-b border-border px-5 py-3.5">
            <CardTitle>Licences issued</CardTitle>
            <span className="text-xs text-muted-foreground">Last {MONTHS_SHOWN} months</span>
          </CardHeader>
          <CardContent className="p-5">
            {status === "loading" ? (
              <Skeleton className="h-[260px] w-full" />
            ) : status === "error" ? (
              <Empty message="Couldn't load statistics." />
            ) : totalActivations === 0 ? (
              <Empty message={`No licences issued in the last ${MONTHS_SHOWN} months.`} />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activations} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="keystats-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--border))" }}
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-popover">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="tabular text-sm font-medium">
                              {payload[0].value} licences
                            </p>
                          </div>
                        ) : null
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="activations"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1.5}
                      fill="url(#keystats-fill)"
                      dot={false}
                      activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border px-5 py-3.5">
            <CardTitle>By plan</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {status === "loading" ? (
              <Skeleton className="h-[260px] w-full" />
            ) : status === "error" || totalPlanned === 0 ? (
              <Empty
                message={status === "error" ? "Couldn't load plans." : "No licences to break down."}
              />
            ) : (
              <div className="space-y-4">
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={plans}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {/*
                          One hue at descending strength rather than a different
                          colour per plan. Plans are an ordinal breakdown of one
                          quantity, and the system spends saturated colour on
                          trade direction alone.
                        */}
                        {plans.map((_, i) => (
                          <Cell
                            key={i}
                            fill={`hsl(var(--primary) / ${Math.max(0.25, 1 - i * 0.22)})`}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="space-y-1.5">
                  {plans.map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: `hsl(var(--primary) / ${Math.max(0.25, 1 - i * 0.22)})`,
                          }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="tabular shrink-0 text-muted-foreground">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
