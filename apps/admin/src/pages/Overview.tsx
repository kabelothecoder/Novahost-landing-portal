import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Gift,
  KeyRound,
  Radio,
  RefreshCw,
  Smartphone,
  UserCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { money, monthLabel, percent, relative } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Overview() {
  const { data, error, loading, reload } = useAsync(() => api.overview(), []);

  if (error) return <LoadError error={error} onRetry={reload} />;

  const rev = data?.revenue;
  const c = data?.counts;

  const chartData =
    rev?.series.map((s) => ({
      month: monthLabel(s.month),
      gross: Math.round(s.gross),
      refunds: Math.round(s.refunds),
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          Everything the business has taken, and everything it is running.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      {/* ── Money ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          loading={loading}
          label="Gross revenue"
          value={money(rev?.grossTotal ?? 0, true)}
          hint={`${rev?.paidCount ?? 0} completed payments`}
          icon={Banknote}
        />
        <Stat
          loading={loading}
          label="Realised"
          value={money(rev?.realisedTotal ?? 0, true)}
          hint="After PayFast fees and refunds"
          tone="good"
        />
        <Stat
          loading={loading}
          label="Fees paid"
          value={money(rev?.feeTotal ?? 0, true)}
          hint={
            rev && rev.grossTotal > 0
              ? `${percent(rev.feeTotal / rev.grossTotal)} of gross`
              : undefined
          }
        />
        <Stat
          loading={loading}
          label="Refunded"
          value={money(rev?.refundTotal ?? 0, true)}
          tone={rev && rev.refundTotal > 0 ? "warn" : "default"}
          hint={rev?.refundTotal ? "Recorded adjustments" : "Nothing given back yet"}
        />
      </div>

      {/* Anything that would quietly distort the numbers above says so here
          rather than being silently folded in or silently dropped. */}
      {!loading && ((data?.sandboxCount ?? 0) > 0 || (data?.failedCount ?? 0) > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/[0.07] px-4 py-3 text-[13px]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-muted-foreground">
            Excluded from the figures above:{" "}
            {(data?.sandboxCount ?? 0) > 0 && (
              <strong className="font-medium text-foreground">
                {data?.sandboxCount} sandbox test payment
                {data?.sandboxCount === 1 ? "" : "s"}
              </strong>
            )}
            {(data?.sandboxCount ?? 0) > 0 && (data?.failedCount ?? 0) > 0 && " and "}
            {(data?.failedCount ?? 0) > 0 && (
              <strong className="font-medium text-foreground">
                {data?.failedCount} incomplete payment{data?.failedCount === 1 ? "" : "s"}
              </strong>
            )}
            .
          </span>
          <Link to="/payments" className="text-[13px] font-medium text-primary hover:underline">
            See them
          </Link>
        </div>
      )}

      {/* ── Revenue by month ── */}
      <Panel
        title="Revenue by month"
        description="Gross received, with refunds shown against the month they were recorded."
      >
        {loading ? (
          <TableSkeleton rows={4} cols={1} />
        ) : chartData.length === 0 ? (
          <Empty
            title="No payments yet"
            body="Once a live PayFast payment completes it appears here. Sandbox tests are excluded."
          />
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px]"
                  stroke="currentColor"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  className="text-[11px]"
                  stroke="currentColor"
                  tickFormatter={(v: number) => `R${v}`}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(v: number, name: string) => [money(v, true), name]}
                />
                <Bar dataKey="gross" name="Gross" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                {chartData.some((d) => d.refunds > 0) && (
                  <Bar
                    dataKey="refunds"
                    name="Refunds"
                    fill="hsl(var(--destructive))"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* ── The platform ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          loading={loading}
          label="Entitled users"
          value={c?.entitled ?? 0}
          hint={`${c?.bound ?? 0} bound to a handset`}
          icon={BadgeCheck}
        />
        <Stat
          loading={loading}
          label="Comped"
          value={c?.comped ?? 0}
          hint="Entitled without ever paying"
          icon={Gift}
          tone={c && c.comped > 0 ? "warn" : "default"}
        />
        <Stat
          loading={loading}
          label="Mentors awaiting approval"
          value={c?.mentorsPending ?? 0}
          hint={`${c?.mentorsApproved ?? 0} approved`}
          icon={UserCheck}
          tone={c && c.mentorsPending > 0 ? "warn" : "default"}
        />
        <Stat
          loading={loading}
          label="Devices seen this week"
          value={c?.devicesSeenThisWeek ?? 0}
          hint={`of ${c?.devices ?? 0} activated`}
          icon={Smartphone}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          loading={loading}
          label="Licences"
          value={c?.licences ?? 0}
          hint={`${c?.licencesActive ?? 0} active`}
          icon={KeyRound}
        />
        <Stat
          loading={loading}
          label="Auto-execute on"
          value={c?.licencesAutoExecute ?? 0}
          hint={
            c && c.licences > 0
              ? `${percent(c.licencesAutoExecute / c.licences)} of the fleet`
              : undefined
          }
          icon={Radio}
          tone={c && c.licencesAutoExecute === 0 ? "bad" : "default"}
        />
        <Stat
          loading={loading}
          label="Signals delivered"
          value={c?.deliveries ?? 0}
          hint={`from ${c?.signals ?? 0} sent`}
        />
        <Stat
          loading={loading}
          label="Executions failed"
          value={c?.executionsFailed ?? 0}
          hint={`of ${c?.executions ?? 0} attempted`}
          tone={c && c.executionsFailed > 0 ? "bad" : "good"}
        />
      </div>

      {/*
        The single most consequential number on this page. A fleet with
        auto-execute off everywhere delivers every signal and trades none of
        them, and nothing else on the dashboard would tell you.
      */}
      {!loading && c && c.licences > 0 && c.licencesAutoExecute === 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/[0.07] px-4 py-3 text-[13px]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-muted-foreground">
            <strong className="font-medium text-foreground">
              None of the {c.licences} licences have auto-execute switched on.
            </strong>{" "}
            Mentor signals are reaching handsets and trading nothing.
          </span>
          <Link to="/signals" className="text-[13px] font-medium text-primary hover:underline">
            Open the pipeline
          </Link>
        </div>
      )}

      {/* ── Recent payments ── */}
      <Panel
        title="Recent payments"
        description="Live, completed PayFast payments, newest first."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/revenue">All revenue</Link>
          </Button>
        }
      >
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !data?.recentPayments.length ? (
          <Empty title="No completed payments yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[240px] truncate font-medium">{p.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {p.productLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.gross)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {relative(p.createdAt)}
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
