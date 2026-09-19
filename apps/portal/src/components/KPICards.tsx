import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { novaHost } from "@/integrations/novahost/client";
import { cn } from "@/lib/utils";

/**
 * What `get_dashboard_stats()` returns as of migration 20260916090000.
 *
 * Every figure is counted from the signed-in mentor's own rows. It used to be
 * counted from the whole table: the RPC is SECURITY DEFINER and named no
 * caller, so a mentor who had issued two keys read "Active licenses: 82" --
 * the platform's total -- and so did every other mentor, seeing the same
 * number as each other.
 *
 * The RPC still emits the three old keys (`total_licenses`, `total_users`,
 * `managed_equity`) so a portal build deployed before that migration keeps
 * rendering numbers instead of "NaN". They are deliberately not read here;
 * drop them from the function once this build is live everywhere.
 */
interface StatsData {
  /** Licences this mentor has issued that are currently `active`. */
  active_licenses: number;
  /** Every licence this mentor has issued, whatever its status. */
  keys_issued: number;
  /** Distinct devices on this mentor's licences with a heartbeat inside 5min. */
  live_fleet: number;
  /** Distinct devices ever activated against this mentor's licences. */
  devices_linked: number;
}

type Status = "loading" | "ready" | "error";

const count = new Intl.NumberFormat("en-ZA");

export function KPICards() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  /*
   * Each tile used to carry a trend badge -- "+12.5%", "+4.2%", "+8.1%", "+2.4%"
   * -- hardcoded next to the live figure it appeared to describe. There is no
   * historical series behind `get_dashboard_stats`, so no delta can be computed
   * honestly and none is shown. Restoring them means a time-bucketed query.
   *
   * "Managed equity" is gone rather than scoped. It summed the top ten rows of
   * `broker_accounts`, a table that holds zero rows and no longer receives any
   * -- balances reach the apps through the `broker-account` function -- so the
   * tile had rendered $0 for every mentor since it shipped. "Keys issued" takes
   * its place, and unlike an equity figure the portal cannot see, it is a
   * number this account actually owns.
   */
  const kpis = [
    { label: "Active licences", value: stats && count.format(stats.active_licenses) },
    { label: "Live now", value: stats && count.format(stats.live_fleet) },
    { label: "Devices linked", value: stats && count.format(stats.devices_linked) },
    { label: "Keys issued", value: stats && count.format(stats.keys_issued) },
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
