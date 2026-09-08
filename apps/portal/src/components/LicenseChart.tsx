import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { novaHost } from "@/integrations/novahost/client";

interface Bucket {
  month: string;
  activations: number;
}

type Status = "loading" | "ready" | "error";

const MONTHS_SHOWN = 6;

/** Empty buckets for the last N months, so a quiet month renders as zero
 *  rather than collapsing the axis. */
function emptyBuckets(): Bucket[] {
  const now = new Date();
  return Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1 - i), 1);
    return { month: d.toLocaleString("en", { month: "short" }), activations: 0 };
  });
}

export function LicenseChart() {
  const [data, setData] = useState<Bucket[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const since = new Date();
      since.setMonth(since.getMonth() - (MONTHS_SHOWN - 1));
      since.setDate(1);
      since.setHours(0, 0, 0, 0);

      try {
        const { data: rows, error } = await novaHost
          .from("licenses")
          .select("created_at")
          .gte("created_at", since.toISOString());

        if (error) throw error;
        if (cancelled) return;

        const buckets = emptyBuckets();
        const index = new Map(buckets.map((b, i) => [b.month, i]));

        for (const row of rows ?? []) {
          const label = new Date(row.created_at).toLocaleString("en", { month: "short" });
          const i = index.get(label);
          if (i !== undefined) buckets[i].activations += 1;
        }

        setData(buckets);
        setStatus("ready");
      } catch (err) {
        console.error("Failed to load license activations:", err);
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = data.reduce((sum, b) => sum + b.activations, 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-baseline justify-between space-y-0 border-b border-border px-5 py-3.5">
        <CardTitle>License activations</CardTitle>
        <span className="text-xs text-muted-foreground">Last {MONTHS_SHOWN} months</span>
      </CardHeader>

      <CardContent className="p-5">
        {status === "loading" ? (
          <Skeleton className="h-[260px] w-full" />
        ) : status === "error" ? (
          <EmptyState message="Couldn't load activations." />
        ) : total === 0 ? (
          /* This widget used to render a hardcoded empty array behind a title
             and a trend icon, so it always drew a blank chart that implied data
             was loading. It now says what is true. */
          <EmptyState message="No licenses issued in the last 6 months." />
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="activations" x1="0" y1="0" x2="0" y2="1">
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
                          {payload[0].value} activations
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
                  fill="url(#activations)"
                  dot={false}
                  activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
