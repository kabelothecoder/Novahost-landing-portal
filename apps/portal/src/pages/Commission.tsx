import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  RefreshCw,
  ScanLine,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRing } from "@/components/ScoreRing";
import {
  AGREEMENT_COPY,
  count,
  fetchAffiliateSummary,
  rand,
  shortDate,
  type AffiliateSummary,
} from "@/lib/affiliate";
import { cn } from "@/lib/utils";

/**
 * The mentor's commission page.
 *
 * Three questions, in the order a mentor asks them: am I on the programme, how
 * close am I this month, and which of my keys actually turned into money.
 *
 * The figures are deliberately conservative. A key counts only once the money
 * has arrived at PayFast and cleared -- generating a key is not a sale, and
 * this page never implies it is. Where a number would be misleading it is not
 * shown at all: commission is quoted only to a mentor with an approved
 * agreement who has met their target, because quoting it to anybody else is how
 * a platform ends up arguing about money it never owed.
 */

type Status = "loading" | "ready" | "error";

function StatStrip({
  items,
  loading,
}: {
  items: Array<{ label: string; value: string; hint?: string }>;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-5 py-4">
          <p className="section-label">{item.label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="tabular mt-1.5 text-2xl font-semibold">{item.value}</p>
          )}
          {item.hint && !loading && (
            <p className="mt-1 text-[12px] text-muted-foreground">{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/** A tick, a clock or a dash — whether a product on this key is paid for. */
function PaidMark({ paid, label }: { paid: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12.5px]",
        paid ? "text-success" : "text-muted-foreground",
      )}
      title={paid ? `${label} paid` : `${label} not paid`}
    >
      {paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function Commission() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<AffiliateSummary | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetchAffiliateSummary();
      setData(res);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not load your commission figures.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loading = status === "loading";
  const s = data?.scoreboard;
  const p = data?.programme;
  const agreementStatus = data?.agreement?.status ?? null;
  const approved = agreementStatus === "approved";

  const stats = useMemo(() => {
    if (!s || !p) {
      return [
        { label: "Qualifying keys", value: "—" },
        { label: "Keys issued", value: "—" },
        { label: "Sales this month", value: "—" },
        { label: "Commission", value: "—" },
      ];
    }
    return [
      {
        label: "Qualifying keys",
        value: count(s.qualifyingKeys),
        hint: `of ${count(s.keysIssued)} issued, all time`,
      },
      {
        label: p.option === "A" ? "Toward your target" : "Qualifying this month",
        value: count(s.progressCount),
        hint: `target ${count(p.target)}`,
      },
      {
        label: "Sales value this month",
        value: rand(s.qualifyingRevenueThisMonth),
        hint: `${count(s.qualifyingKeysThisMonth)} paid in full`,
      },
      {
        label: "Commission earned",
        value: approved ? rand(p.option === "A" ? s.earnedLifetime : s.earnedThisMonth) : "—",
        hint: approved
          ? s.targetMet
            ? `at ${(p.rate * 100).toFixed(0)}%`
            : "target not met yet"
          : "agreement not approved",
      },
    ];
  }, [s, p, approved]);

  if (status === "error") {
    return (
      <div className="mx-auto max-w-[1400px]">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void load()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const websiteThreshold = p?.websiteThreshold ?? 30;
  const websiteUnlocked = (s?.qualifyingKeys ?? 0) >= websiteThreshold;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* ---- Where the mentor stands with the agreement ------------------- */}
      {!loading && agreementStatus !== "approved" && (
        <Alert className={cn(agreementStatus === "rejected" && "border-destructive/40")}>
          <BadgeCheck className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong className="font-medium">
                {agreementStatus ? AGREEMENT_COPY[agreementStatus].label : "No agreement yet"}.
              </strong>{" "}
              {agreementStatus
                ? AGREEMENT_COPY[agreementStatus].body
                : "Sign the Mentor Partnership & Commission Agreement to start earning on the keys you sell. Your sales are still being counted in the meantime."}
            </span>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/affiliate/agreement">
                {agreementStatus === "submitted" ? "View your agreement" : "Open the agreement"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <StatStrip items={stats} loading={loading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---- The score --------------------------------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-baseline justify-between space-y-0 border-b border-border px-5 py-3.5">
            <CardTitle>
              {p?.option === "A" ? "Giveaway target" : "This month"}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {p?.option === "A" ? "all time" : data?.month.label}
            </span>
          </CardHeader>
          <CardContent className="flex flex-col items-center px-5 py-7">
            {loading ? (
              <Skeleton className="h-[168px] w-[168px] rounded-full" />
            ) : (
              <ScoreRing
                value={s?.progressCount ?? 0}
                target={p?.target ?? 10}
                label="qualifying keys"
                caption={
                  s?.targetMet
                    ? `Target met. ${p?.rateInForce ? "Commission is accruing" : "It starts accruing once your agreement is approved"} at ${((p?.rate ?? 0) * 100).toFixed(0)}%.`
                    : `${count(Math.max(0, (p?.target ?? 0) - (s?.progressCount ?? 0)))} more to unlock ${((p?.rate ?? 0) * 100).toFixed(0)}% commission${p?.option === "B" ? " this month" : ""}.`
                }
              />
            )}

            {/*
             * The same fact reads two completely different ways depending on
             * `require_scanner`, and getting it wrong would be a lie about
             * somebody's money. When the scanner is required these keys are
             * stuck short of qualifying; when it is not, they already count and
             * the scanner is just upsell the mentor has left on the table.
             */}
            {!loading && (s?.awaitingScanner ?? 0) > 0 && (
              <p className="mt-5 flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-[12.5px] text-muted-foreground">
                <ScanLine className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong className="font-medium text-foreground">
                    {count(s!.awaitingScanner)}{" "}
                    {s!.awaitingScanner === 1 ? "student has" : "students have"}
                  </strong>{" "}
                  {p?.requireScanner
                    ? "paid for app access but not the chart scanner. A key counts once both are paid."
                    : "not added the chart scanner. Those keys already count — the scanner is extra you could still sell them."}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* ---- Earnings and the website reward ----------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-baseline justify-between space-y-0 border-b border-border px-5 py-3.5">
            <CardTitle>Your programme</CardTitle>
            {!loading && p && (
              <Badge variant="secondary" className="font-normal">
                Option {p.option} — {p.optionLabel}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
                  {[
                    {
                      label: "Commission rate",
                      value: `${((p?.rate ?? 0) * 100).toFixed(0)}%`,
                      hint: p?.rateInForce ? "in force" : "once approved",
                    },
                    {
                      label: "Paid so far",
                      value: rand(s?.paidOut ?? 0),
                      hint: p?.payoutFrequency ?? "not set",
                    },
                    {
                      label: "Sales value, all time",
                      value: rand(s?.qualifyingRevenue ?? 0),
                      hint: "fully paid keys",
                    },
                    {
                      label: "Last sale",
                      value: s?.lastSaleAt ? shortDate(s.lastSaleAt) : "—",
                      hint: s?.lastSaleAt ? "" : "no paid keys yet",
                    },
                  ].map((tile) => (
                    <div key={tile.label} className="bg-card px-4 py-3">
                      <p className="section-label">{tile.label}</p>
                      <p className="tabular mt-1 text-lg font-semibold">{tile.value}</p>
                      {tile.hint && (
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{tile.hint}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* The free website. Shown to everyone, because a reward nobody
                    knows about motivates nobody -- but locked until earned. */}
                <div className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                          websiteUnlocked
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {websiteUnlocked ? (
                          <Globe className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {websiteUnlocked
                            ? "Your free landing page is unlocked"
                            : `Free landing page at ${count(websiteThreshold)} qualifying keys`}
                        </p>
                        <p className="mt-0.5 max-w-[60ch] text-[12.5px] text-muted-foreground">
                          {websiteUnlocked
                            ? "A page for your robot with your broker links, your results and your group — buyers get their key and setup instructions the moment they pay."
                            : `You have ${count(s?.qualifyingKeys ?? 0)}. ${count(Math.max(0, websiteThreshold - (s?.qualifyingKeys ?? 0)))} to go.`}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant={websiteUnlocked ? "default" : "outline"}
                      className="gap-1.5"
                    >
                      <Link to="/builder">
                        {websiteUnlocked ? "Set it up" : "See what you get"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700",
                        websiteUnlocked ? "bg-success" : "bg-primary",
                      )}
                      style={{
                        width: `${Math.min(100, ((s?.qualifyingKeys ?? 0) / Math.max(1, websiteThreshold)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- The detail --------------------------------------------------- */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="sales">
            <div className="border-b border-border px-5 pt-3.5">
              <TabsList className="h-9">
                <TabsTrigger value="sales">Keys</TabsTrigger>
                <TabsTrigger value="robots">Robots</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
              </TabsList>
            </div>

            {/* Keys -------------------------------------------------------- */}
            <TabsContent value="sales" className="m-0 p-0">
              {loading ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (data?.sales.length ?? 0) === 0 ? (
                <p className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                  You have not issued any licence keys yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Paid for</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Counts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.sales.map((row) => (
                        <TableRow key={row.licenseId}>
                          <TableCell className="tabular whitespace-nowrap font-medium">
                            {row.licenseKey}
                          </TableCell>
                          <TableCell className="max-w-[24ch] truncate text-muted-foreground">
                            {row.buyerEmail ?? "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <PaidMark paid={row.appPaid} label="App" />
                              <PaidMark paid={row.scannerPaid} label="Scanner" />
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {shortDate(row.issuedAt)}
                          </TableCell>
                          <TableCell className="tabular whitespace-nowrap text-right">
                            {row.gross > 0 ? rand(row.gross) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.qualified ? (
                              <Badge className="bg-success text-success-foreground hover:bg-success">
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="font-normal">
                                Not yet
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Robots ------------------------------------------------------ */}
            <TabsContent value="robots" className="m-0 p-0">
              {loading ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (data?.robots.length ?? 0) === 0 ? (
                <p className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                  You have not issued a key against any robot yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Robot</TableHead>
                        <TableHead className="text-right">Keys issued</TableHead>
                        <TableHead className="text-right">Paid in full</TableHead>
                        <TableHead className="text-right">Conversion</TableHead>
                        <TableHead className="text-right">Sales value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...data!.robots]
                        .sort((a, b) => b.qualifyingKeys - a.qualifyingKeys || b.keysIssued - a.keysIssued)
                        .map((r) => (
                          <TableRow key={r.eaId}>
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-2">
                                <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                                {r.name}
                              </span>
                            </TableCell>
                            <TableCell className="tabular text-right">{count(r.keysIssued)}</TableCell>
                            <TableCell className="tabular text-right">
                              {count(r.qualifyingKeys)}
                            </TableCell>
                            <TableCell className="tabular text-right">
                              {r.conversionPct.toFixed(1)}%
                            </TableCell>
                            <TableCell className="tabular text-right">
                              {rand(r.qualifyingRevenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <p className="border-t border-border px-5 py-3 text-[12px] text-muted-foreground">
                    Conversion is keys paid in full over keys issued — the measure that cannot be
                    inflated by generating keys nobody buys.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Payouts ----------------------------------------------------- */}
            <TabsContent value="payouts" className="m-0 p-0">
              {loading ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (data?.payouts.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 text-[14px] font-medium">No payouts yet</p>
                  <p className="mt-1 max-w-[46ch] text-[13px] text-muted-foreground">
                    Commission is settled {p?.payoutFrequency ?? "on the schedule in your agreement"}{" "}
                    once your target is met. Every payment will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Keys</TableHead>
                        <TableHead className="text-right">Sales value</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.payouts.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="whitespace-nowrap">
                            {shortDate(po.periodStart)} – {shortDate(po.periodEnd)}
                          </TableCell>
                          <TableCell className="tabular text-right">
                            {count(po.qualifyingKeys)}
                          </TableCell>
                          <TableCell className="tabular text-right">
                            {rand(po.grossRevenue)}
                          </TableCell>
                          <TableCell className="tabular text-right">
                            {(po.commissionRate * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell className="tabular text-right font-medium">
                            {rand(po.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={po.status === "paid" ? "default" : "secondary"}
                              className={cn(
                                "font-normal",
                                po.status === "paid" &&
                                  "bg-success text-success-foreground hover:bg-success",
                              )}
                            >
                              {po.status === "paid"
                                ? `Paid ${shortDate(po.paidAt)}`
                                : po.status === "cancelled"
                                  ? "Cancelled"
                                  : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="px-1 pb-2 text-[12px] leading-relaxed text-muted-foreground">
        A key counts as a qualifying sale once the student has paid for app access
        {p?.requireScanner ? " and the AI chart scanner" : ""}, the payment has cleared at PayFast,
        and it has not been refunded or reversed. Keys you have generated but nobody has paid for do
        not count toward commission.
      </p>
    </div>
  );
}
