import { useMemo, useState } from "react";
import { KeyRound, RefreshCw, Search, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { date, percent, relative, shortId } from "@/lib/format";
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

type Filter = "all" | "active" | "expired" | "auto" | "idle" | "unused";

const FILTERS: Array<[Filter, string]> = [
  ["all", "All"],
  ["active", "Active"],
  ["expired", "Expired"],
  ["auto", "Auto-execute on"],
  ["idle", "Not seen in 30 days"],
  ["unused", "Never activated"],
];

const DAY = 86_400_000;

/**
 * The fleet: every licence a mentor has issued, and the handsets holding them.
 *
 * The column that matters most is the least obvious one. A licence with
 * auto-execute off receives every signal its mentor sends and trades none of
 * them, and from the mentor's side that is indistinguishable from working.
 */
export default function Licences() {
  const { data, error, loading, reload } = useAsync(() => api.licences(), []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = data?.rows ?? [];
  const tickets = data?.tickets ?? [];
  const now = Date.now();

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === "active" && !r.expired).length,
      auto: rows.filter((r) => r.autoExecute).length,
      devices: data?.deviceTotal ?? 0,
      idle: rows.filter(
        (r) => r.lastSeenAt && now - new Date(r.lastSeenAt).getTime() > 30 * DAY,
      ).length,
    }),
    [rows, data, now],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !(r.licenseKey ?? "").toLowerCase().includes(q) &&
        !(r.ownerEmail ?? "").toLowerCase().includes(q) &&
        !(r.robot ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      switch (filter) {
        case "active":
          return r.status === "active" && !r.expired;
        case "expired":
          return r.expired;
        case "auto":
          return r.autoExecute;
        case "idle":
          return Boolean(r.lastSeenAt) && now - new Date(r.lastSeenAt!).getTime() > 30 * DAY;
        case "unused":
          return r.deviceCount === 0;
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
          Every licence key issued, the handsets on it, and whether it will actually trade.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat loading={loading} label="Licences" value={stats.total} icon={KeyRound} />
        <Stat loading={loading} label="Active" value={stats.active} />
        <Stat
          loading={loading}
          label="Auto-execute on"
          value={stats.auto}
          hint={stats.total ? percent(stats.auto / stats.total) : undefined}
          tone={stats.auto === 0 && stats.total > 0 ? "bad" : "default"}
        />
        <Stat loading={loading} label="Devices activated" value={stats.devices} icon={Smartphone} />
        <Stat
          loading={loading}
          label="Idle 30+ days"
          value={stats.idle}
          tone={stats.idle ? "warn" : "default"}
        />
      </div>

      <Panel
        title="Licences"
        description={`${filtered.length} of ${rows.length} shown.`}
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Key, owner or robot"
              className="h-9 w-[210px] pl-8 text-[13px]"
            />
          </div>
        }
      >
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
          <TabsList className="flex-wrap">
            {FILTERS.map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="text-[13px]">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : !filtered.length ? (
          <Empty
            title={query || filter !== "all" ? "Nothing matches those filters" : "No licences yet"}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Robot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Devices</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead className="text-right">Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-[12.5px]">
                      {r.licenseKey ?? shortId(r.id)}
                      {r.isMaster && (
                        <Badge variant="outline" className="ml-2 font-normal">
                          master
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {r.ownerEmail ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{r.robot ?? "—"}</TableCell>
                    <TableCell>
                      {r.expired ? (
                        <Badge variant="destructive" className="font-normal">
                          Expired {date(r.expiresAt)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal capitalize">
                          {r.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.deviceCount}
                      <span className="text-muted-foreground"> / {r.maxDevices}</span>
                    </TableCell>
                    <TableCell>
                      {r.autoExecute ? (
                        <Badge variant="secondary" className="font-normal text-success">
                          On
                        </Badge>
                      ) : (
                        <span className="text-[12.5px] text-muted-foreground">Off</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {r.lastSeenAt ? relative(r.lastSeenAt) : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Panel
        title="Device move tickets"
        description="A paid move issues a ticket; it is spent when the new handset claims the licence."
      >
        {loading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : !tickets.length ? (
          <Empty title="No move tickets" body="Nobody has paid to move a licence to a new phone." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Target device</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="max-w-[220px] truncate font-medium">{t.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.state === "used" ? "secondary" : t.state === "verified" ? "outline" : "outline"
                        }
                        className="font-normal capitalize"
                      >
                        {t.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">
                      {shortId(t.targetDeviceId, 5)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{t.attempts}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {relative(t.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}
