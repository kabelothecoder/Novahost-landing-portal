import { useMemo, useState } from "react";
import { Download, RefreshCw, Search, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { date, money, relative, shortId } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Filter = "all" | "paid" | "comped" | "expiring" | "expired" | "unbound";

const FILTERS: Array<[Filter, string]> = [
  ["all", "All"],
  ["paid", "Paid"],
  ["comped", "Comped"],
  ["expiring", "Expiring"],
  ["expired", "Expired"],
  ["unbound", "No device"],
];

const DAY = 86_400_000;

/**
 * Every app entitlement, and the date it runs out.
 *
 * `subscriptions` is keyed by email, not by a user account — an app buyer never
 * creates one. So this list is emails, and "who they are" is whatever the
 * payment and the device binding can tell us.
 */
export default function Subscriptions() {
  const { data, error, loading, reload } = useAsync(() => api.subscriptions(), []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = data?.rows ?? [];
  const now = Date.now();

  const stats = useMemo(() => {
    const expiryOf = (r: (typeof rows)[number]) =>
      r.expiry ? new Date(r.expiry).getTime() : null;
    return {
      total: rows.length,
      lifetime: rows.filter((r) => r.isLifetime).length,
      scanner: rows.filter((r) => r.hasScanner).length,
      comped: rows.filter((r) => r.comped).length,
      expiring: rows.filter((r) => {
        const t = expiryOf(r);
        return t !== null && t > now && t - now < 30 * DAY;
      }).length,
    };
  }, [rows, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.email.includes(q) && !(r.licenseKey ?? "").toLowerCase().includes(q)) return false;

      const t = r.expiry ? new Date(r.expiry).getTime() : null;
      switch (filter) {
        case "paid":
          return r.paidCount > 0;
        case "comped":
          return r.comped;
        case "expiring":
          return t !== null && t > now && t - now < 30 * DAY;
        case "expired":
          return t !== null && t <= now;
        case "unbound":
          return !r.deviceId;
        default:
          return true;
      }
    });
  }, [rows, query, filter, now]);

  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          One row per email that has app access. &ldquo;Comped&rdquo; means entitled with no matching
          payment on the live merchant &mdash; an admin grant, or a manual fix.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat loading={loading} label="Entitlements" value={stats.total} />
        <Stat loading={loading} label="Lifetime" value={stats.lifetime} />
        <Stat loading={loading} label="With scanner" value={stats.scanner} />
        <Stat
          loading={loading}
          label="Comped"
          value={stats.comped}
          tone={stats.comped ? "warn" : "default"}
        />
        <Stat
          loading={loading}
          label="Expiring in 30 days"
          value={stats.expiring}
          tone={stats.expiring ? "warn" : "default"}
        />
      </div>

      <Panel
        title="Entitlements"
        description={`${filtered.length} of ${rows.length} shown.`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Email or licence key"
                className="h-9 w-[210px] pl-8 text-[13px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!filtered.length}
              onClick={() => {
                const csv = [
                  "email,lifetime,premium,scanner,expiry,device_bound,paid_total,paid_count,comped,created",
                  ...filtered.map((r) =>
                    [
                      r.email,
                      r.isLifetime,
                      r.isPremium,
                      r.hasScanner,
                      r.expiry ?? "",
                      Boolean(r.deviceId),
                      r.paidTotal,
                      r.paidCount,
                      r.comped,
                      r.createdAt ?? "",
                    ]
                      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                      .join(","),
                  ),
                ].join("\n");
                const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `novahost-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        }
      >
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
          <TabsList>
            {FILTERS.map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="text-[13px]">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <TableSkeleton rows={7} cols={6} />
        ) : !filtered.length ? (
          <Empty
            title={
              query || filter !== "all" ? "Nothing matches those filters" : "No entitlements yet"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Entitlements</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const t = r.expiry ? new Date(r.expiry).getTime() : null;
                  const expired = t !== null && t <= now;
                  const soon = t !== null && t > now && t - now < 30 * DAY;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[240px] truncate font-medium">
                        {r.email}
                        {r.comped && (
                          <Badge variant="outline" className="ml-2 font-normal text-warning">
                            comped
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {r.isLifetime && (
                            <Badge variant="secondary" className="font-normal">
                              Lifetime
                            </Badge>
                          )}
                          {r.isPremium && !r.isLifetime && (
                            <Badge variant="secondary" className="font-normal">
                              Premium
                            </Badge>
                          )}
                          {r.hasScanner && (
                            <Badge variant="secondary" className="font-normal">
                              Scanner
                            </Badge>
                          )}
                          {!r.isLifetime && !r.isPremium && !r.hasScanner && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className={
                          expired
                            ? "whitespace-nowrap text-destructive"
                            : soon
                              ? "whitespace-nowrap text-warning"
                              : "whitespace-nowrap text-muted-foreground"
                        }
                      >
                        {r.isLifetime && !r.expiry ? "Never" : date(r.expiry)}
                      </TableCell>
                      <TableCell>
                        {r.deviceId ? (
                          <span
                            className="inline-flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground"
                            title={r.deviceId}
                          >
                            <Smartphone className="h-3 w-3" />
                            {shortId(r.deviceId, 5)}
                          </span>
                        ) : (
                          <span className="text-[12.5px] text-muted-foreground">Not bound</span>
                        )}
                        {r.reactivationCount > 0 && (
                          <Badge variant="outline" className="ml-2 font-normal">
                            {r.reactivationCount} move{r.reactivationCount === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.paidCount ? money(r.paidTotal) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                        {relative(r.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}
