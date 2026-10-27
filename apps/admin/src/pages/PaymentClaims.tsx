import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, X } from "lucide-react";
import { api } from "@/lib/api";
import { dateTime, relative } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, TableSkeleton } from "@/components/primitives";
import { PhoneAlerts } from "@/components/PhoneAlerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Row = Awaited<ReturnType<typeof api.paymentClaimsList>>["rows"][number];

const PRODUCT_LABEL: Record<Row["product"], string> = {
  APP: "App access · $37 · 60 days",
  SCANS: "Scan pack · $11 · 15 scans",
};

const APPROVE_LABEL: Record<Row["product"], string> = {
  APP: "Approve · give 60 days",
  SCANS: "Approve · add 15 scans",
};

/**
 * "I've paid" claims for the hosted PayPal links.
 *
 * PayPal tells the app nothing, so a payer says what they bought and which
 * email they paid with, and the app asks here. A claim grants nothing until
 * somebody presses Approve, and the only evidence is PayPal: open it, find a
 * payment of that amount from that email, and only then approve. The flags on
 * each card are prompts for what to look at, not verdicts.
 */
export default function PaymentClaims() {
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const { data, error, loading, reload } = useAsync(() => api.paymentClaimsList(tab), [tab]);
  const { toast } = useToast();

  const [acting, setActing] = useState<string | null>(null);
  const [declining, setDeclining] = useState<Row | null>(null);
  const [declineNote, setDeclineNote] = useState("");

  // Someone paying while the console sits open on a phone: look again whenever
  // it comes back to the front.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const approve = async (row: Row) => {
    setActing(row.id);
    try {
      const res = await api.paymentClaimApprove(row.id);
      toast({
        title: "Approved",
        description:
          [res.summary, res.warning].filter(Boolean).join(" · ") ||
          `${row.appEmail} has been given access.`,
      });
      reload();
    } catch (err) {
      toast({
        title: "Could not approve",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
      reload();
    } finally {
      setActing(null);
    }
  };

  const decline = async () => {
    if (!declining) return;
    const row = declining;
    setActing(row.id);
    try {
      const res = await api.paymentClaimReject(row.id, declineNote.trim());
      toast({
        title: "Declined",
        description: res.emailed
          ? `${row.appEmail} has been told why.`
          : `${row.appEmail} will see the reason in the app, but the email did not send.`,
      });
      setDeclining(null);
      setDeclineNote("");
      reload();
    } catch (err) {
      toast({
        title: "Could not decline",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setActing(null);
    }
  };

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          People who paid on PayPal and are waiting in the app. Open PayPal, find a payment of the
          right amount from the PayPal email shown, and only then approve. They are waiting, so
          answer quickly.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <PhoneAlerts />
          <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "decided")}>
        <TabsList>
          <TabsTrigger value="pending">Waiting for you</TabsTrigger>
          <TabsTrigger value="decided">Decided</TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <LoadError error={error} onRetry={reload} />
      ) : loading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : !rows.length ? (
        <Empty
          title={tab === "pending" ? "Nothing waiting" : "No decisions yet"}
          body={
            tab === "pending"
              ? "A claim appears here when someone taps “I've paid” in the app. Turn on phone alerts to hear about it straight away."
              : "Approved and declined claims show up here, newest first."
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Panel
              key={r.id}
              title={r.appEmail}
              description={`${PRODUCT_LABEL[r.product]} · asked ${relative(r.requestedAt)} · ${dateTime(r.requestedAt)}`}
              action={
                r.status === "pending" ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acting === r.id}
                      onClick={() => {
                        setDeclining(r);
                        setDeclineNote("");
                      }}
                      className="gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      disabled={acting === r.id}
                      onClick={() => void approve(r)}
                      className="gap-1.5"
                    >
                      {acting === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {APPROVE_LABEL[r.product]}
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant={r.status === "approved" ? "secondary" : "destructive"}
                    className="font-normal"
                  >
                    {r.status === "approved" ? "Approved" : "Declined"}
                  </Badge>
                )
              }
            >
              <div className="space-y-4">
                <dl className="grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Look for this PayPal email</dt>
                    <dd className="break-all font-mono text-[12.5px] font-medium">{r.paypalEmail}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">App access now</dt>
                    <dd>
                      {r.accessActive
                        ? r.accessUntil === "lifetime"
                          ? "Lifetime"
                          : `Active until ${r.accessUntil ? dateTime(r.accessUntil) : "—"}`
                        : "None"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Scans in the bank</dt>
                    <dd>{r.scanCredits}</dd>
                  </div>
                </dl>

                {(r.emailsDiffer || r.deviceConflict || r.priorApprovalsForPaypalEmail.length > 0) &&
                  r.status === "pending" && (
                    <ul className="space-y-1.5 text-[12.5px]">
                      {r.emailsDiffer && (
                        <li className="text-muted-foreground">
                          The PayPal email differs from the app email. That is normal; match on the
                          PayPal email.
                        </li>
                      )}
                      {r.priorApprovalsForPaypalEmail.length > 0 && (
                        <li className="flex items-start gap-1.5 text-destructive">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            This PayPal email was already approved for{" "}
                            {r.priorApprovalsForPaypalEmail
                              .map((p) => `${p.appEmail} (${p.product === "SCANS" ? "scans" : "app"})`)
                              .join(", ")}
                            . Make sure this is a different payment, not the same one claimed twice.
                          </span>
                        </li>
                      )}
                      {r.deviceConflict && (
                        <li className="flex items-start gap-1.5 text-destructive">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            This email is already active on a different phone. Approving adds the days
                            but does not move it to this phone.
                          </span>
                        </li>
                      )}
                    </ul>
                  )}

                {r.status !== "pending" && (
                  <p className="text-[12.5px] text-muted-foreground">
                    {r.status === "approved" ? "Approved" : "Declined"} by {r.decidedBy ?? "—"} on{" "}
                    {dateTime(r.decidedAt)}
                    {r.grantSummary ? ` · ${r.grantSummary}` : ""}
                    {r.decisionNote ? ` — “${r.decisionNote}”` : ""}
                  </p>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(declining)}
        onOpenChange={(o) => {
          if (!o && !acting) setDeclining(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this claim?</DialogTitle>
            <DialogDescription>
              {declining?.appEmail} is told it was declined and sees your message. If they did pay,
              the email asks them to reply with their PayPal receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="claim-decline-note">Message to the user</Label>
            <Textarea
              id="claim-decline-note"
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="e.g. I could not find a $37 payment from that PayPal email. Send me your PayPal receipt."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(acting)} onClick={() => setDeclining(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(acting) || declineNote.trim().length < 5}
              onClick={() => void decline()}
            >
              {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Decline claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
