import { useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { date, money, monthLabel, percent } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Turn the payments table into a CSV the same way it is displayed.
 *
 * Quotes every field: an email cannot contain a comma but a product label
 * could, and a spreadsheet that silently shifts a column is a worse outcome
 * than a slightly noisier file.
 */
function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    columns.map(escape).join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Revenue() {
  const { data, error, loading, reload } = useAsync(() => api.revenue(), []);
  const [query, setQuery] = useState("");

  const payments = data?.payments ?? [];
  const rev = data?.revenue;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        (p.email ?? "").includes(q) ||
        (p.pfPaymentId ?? "").includes(q) ||
        p.productLabel.toLowerCase().includes(q),
    );
  }, [payments, query]);

  const series =
    rev?.series.map((s) => ({
      month: monthLabel(s.month),
      gross: Math.round(s.gross),
      net: Math.round(s.net),
    })) ?? [];

  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          Read from the PayFast ITN log, which is the only authentic record of a payment this system
          keeps. Live merchant only &mdash; sandbox tests are quarantined on the payments page.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat loading={loading} label="Gross" value={money(rev?.grossTotal ?? 0, true)} />
        <Stat
          loading={loading}
          label="Net from PayFast"
          value={money(rev?.netTotal ?? 0, true)}
          hint={`Less ${money(rev?.feeTotal ?? 0, true)} in fees`}
        />
        <Stat
          loading={loading}
          label="Refunded"
          value={money(rev?.refundTotal ?? 0, true)}
          tone={rev && rev.refundTotal > 0 ? "warn" : "default"}
        />
        <Stat
          loading={loading}
          label="Realised"
          value={money(rev?.realisedTotal ?? 0, true)}
          tone="good"
          hint="What the business kept"
        />
      </div>

      <Panel title="Gross and net by month">
        {loading ? (
          <TableSkeleton rows={4} cols={1} />
        ) : series.length === 0 ? (
          <Empty title="No completed payments yet" />
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
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
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(v: number, name: string) => [money(v, true), name]}
                />
                <Line
                  type="monotone"
                  dataKey="gross"
                  name="Gross"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title="By product" description="Which of the three things people actually buy.">
        {loading ? (
          <TableSkeleton rows={3} cols={4} />
        ) : !rev?.byProduct.length ? (
          <Empty title="Nothing sold yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rev.byProduct.map((p) => (
                <TableRow key={p.product}>
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(p.gross)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {rev.grossTotal > 0 ? percent(p.gross / rev.grossTotal) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel
        title="Every payment"
        description={`${filtered.length} of ${payments.length} shown.`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Email or payment id"
                className="h-9 w-[200px] pl-8 text-[13px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!filtered.length}
              onClick={() =>
                downloadCsv(
                  `novahost-payments-${new Date().toISOString().slice(0, 10)}.csv`,
                  toCsv(
                    filtered.map((p) => ({
                      date: p.createdAt,
                      email: p.email,
                      product: p.productLabel,
                      gross: p.gross,
                      fee: p.fee,
                      net: p.net,
                      pf_payment_id: p.pfPaymentId,
                      status: p.status,
                    })),
                    ["date", "email", "product", "gross", "fee", "net", "pf_payment_id", "status"],
                  ),
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        }
      >
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : !filtered.length ? (
          <Empty
            title={query ? "Nothing matches that search" : "No completed payments yet"}
            body={query ? undefined : "Live PayFast payments appear here as their ITNs arrive."}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>PayFast id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {date(p.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate font-medium">
                      {p.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="whitespace-nowrap font-normal">
                        {p.productLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.gross)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      &minus;{money(p.fee)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(p.net)}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">
                      {p.pfPaymentId ?? "—"}
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
