import { AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { dateTime, percent, relative, shortId } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Where a trade actually gets to.
 *
 * A signal has three lives and they can each fail independently: it is created,
 * it is delivered to a licence, and it is executed against a broker. The
 * columns are in that order for a reason — reading left to right shows you
 * exactly which step is dropping things.
 */
export default function Signals() {
  const { data, error, loading, reload } = useAsync(() => api.signals(), []);

  if (error) return <LoadError error={error} onRetry={reload} />;

  const h = data?.health;
  const rows = data?.rows ?? [];
  const failures = data?.failures ?? [];

  const noneOptedIn = Boolean(h && h.licences > 0 && h.autoExecuteOptedIn === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          Created &rarr; delivered &rarr; executed. The last 200 signals.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      {/*
        The finding that explains most "the robot isn't trading" reports. Signals
        are delivered to every licence; only licences with auto-execute on ever
        turn one into an order. Zero opt-in means a perfectly healthy pipeline
        that trades nothing, and no other number on this page would say so.
      */}
      {!loading && noneOptedIn && (
        <div className="flex flex-wrap items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/[0.07] px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-[13px] leading-relaxed">
            <p className="font-medium">
              Not one of the {h?.licences} licences has auto-execute switched on.
            </p>
            <p className="mt-1 text-muted-foreground">
              Every signal below was delivered and none of them could ever have traded. The toggle
              is per licence and the user has to turn it on in the app; until somebody does, mentor
              sends reach nobody&rsquo;s broker.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat loading={loading} label="Signals" value={h?.signals ?? 0} />
        <Stat
          loading={loading}
          label="Deliveries"
          value={h?.deliveries ?? 0}
          hint="Claims by a handset"
        />
        <Stat
          loading={loading}
          label="Executions"
          value={h?.executions ?? 0}
          hint={`${h?.executionsFailed ?? 0} failed`}
          tone={h && h.executionsFailed > 0 ? "warn" : "default"}
        />
        <Stat
          loading={loading}
          label="Auto-execute opt-in"
          value={h ? `${h.autoExecuteOptedIn} / ${h.licences}` : "—"}
          hint={h ? percent(h.autoExecuteShare) : undefined}
          tone={noneOptedIn ? "bad" : "default"}
        />
      </div>

      {!loading && h && h.licences > 0 && (
        <Panel
          title="Fleet opt-in"
          description="Share of licences that will turn a delivered signal into a real order."
        >
          <Progress value={h.autoExecuteShare * 100} className="h-2" />
          <p className="mt-3 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">{h.autoExecuteOptedIn}</span> of{" "}
            <span className="font-medium text-foreground">{h.licences}</span> licences will execute.
          </p>
        </Panel>
      )}

      <Panel title="Recent signals">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !rows.length ? (
          <Empty title="No signals yet" body="Nothing has been broadcast from the mentor portal." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Robot</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Executed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {relative(s.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{s.robot ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[12.5px]">{s.pair ?? "—"}</TableCell>
                    <TableCell>
                      {s.side ? (
                        <Badge
                          variant="outline"
                          className={
                            s.side.includes("BUY") || s.side === "LONG"
                              ? "font-normal text-long"
                              : "font-normal text-short"
                          }
                        >
                          {s.side}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.delivered}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.executedOk > 0 && <span className="text-success">{s.executedOk}</span>}
                      {s.executedOk > 0 && s.executedFailed > 0 && (
                        <span className="text-muted-foreground"> / </span>
                      )}
                      {s.executedFailed > 0 && (
                        <span className="text-destructive">{s.executedFailed} failed</span>
                      )}
                      {s.executedOk === 0 && s.executedFailed === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Panel
        title="Execution failures"
        description="What the broker said when an order did not go through."
      >
        {loading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : !failures.length ? (
          <Empty
            title="No failed executions"
            body="Every attempt that reached a broker was accepted."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Licence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dateTime(f.executedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-[12.5px]">{f.pair ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="font-normal">
                        {f.status ?? "unknown"}
                      </Badge>
                    </TableCell>
                    {/*
                      Brokers send plain-English refusals. Show what they said
                      rather than replacing it with a generic — the real message
                      is usually the whole diagnosis.
                    */}
                    <TableCell className="max-w-[360px] text-[12.5px] text-muted-foreground">
                      {f.detail || f.code || "No reason given"}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">
                      {shortId(f.licenseId, 5)}
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
