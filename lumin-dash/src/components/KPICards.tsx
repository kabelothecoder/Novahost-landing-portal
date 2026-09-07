import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { novaHost } from "@/integrations/novahost/client";
import { cn } from "@/lib/utils";

interface StatsData {
  total_licenses: number;
  live_fleet: number;
  total_users: number;
  managed_equity: number;
}

type Status = "loading" | "ready" | "error";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const count = new Intl.NumberFormat("en-ZA");

export function KPICards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const { data, error } = await novaHost.rpc("get_dashboard_stats");
        if (error) throw error;
        if (cancelled) return;
        // The RPC is typed `Returns: Json`, so the shape has to be asserted.
        setStats(data as unknown as StatsData);
        setStatus("ready");
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        if (!cancelled) setStatus("error");
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  /*
   * Each tile used to carry a trend badge — "+12.5%", "+4.2%", "+8.1%", "+2.4%"
   * — hardcoded next to the live figure it appeared to describe. There is no
   * historical series behind `get_dashboard_stats`, so no delta can be computed
   * honestly and none is shown. Restoring them means a time-bucketed query.
   */
  const kpis = [
    { label: "Active licenses", value: stats && count.format(stats.total_licenses) },
    { label: "Live EAs", value: stats && count.format(stats.live_fleet) },
    { label: "Managed equity", value: stats && currency.format(stats.managed_equity) },
    { label: "Users", value: stats && count.format(stats.total_users) },
  ];

  return (
    /*
     * The 1px gaps over a border-coloured background become the dividers, so
     * the rules land correctly at 1, 2 and 4 columns without any per-index
     * border maths (`divide-x` borders by DOM order, which puts a stray rule
     * down the left edge of the second row once the grid wraps).
     */
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="bg-card px-5 py-4">
          <p className="section-label">{kpi.label}</p>
          {status === "loading" ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p
              className={cn(
                "tabular mt-1.5 text-2xl font-semibold",
                status === "error" && "text-muted-foreground",
              )}
              title={status === "error" ? "Could not load dashboard stats" : undefined}
            >
              {status === "error" ? "—" : kpi.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
