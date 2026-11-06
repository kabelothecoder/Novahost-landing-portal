import { useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { api } from "@/lib/api";
import { dateTime, relative, shortId } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, TableSkeleton } from "@/components/primitives";
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

type Row = Awaited<ReturnType<typeof api.deviceMovesList>>["rows"][number];

const STATUS_LABEL: Record<Row["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Declined",
  cancelled: "Cancelled",
};

/**
 * Device moves: a paid licence cannot change handset until somebody here says so.
 *
 * The user has already proved they can read the licence's mailbox and has typed
 * a reason; nothing is charged until an admin approves. Approving lets the app
 * offer the R150 checkout, declining ends the request, and either way the user
 * is emailed. The decision is judged on the reason and the licence's history,
 * so both sit on the card rather than behind a click.
 */
export default function DeviceMoves() {
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const { data, error, loading, reload } = useAsync(() => api.deviceMovesList(tab), [tab]);
  const { toast } = useToast();

  const [acting, setActing] = useState<string | null>(null);

  // The row being declined, and what the admin has typed to the user.
  const [declining, setDeclining] = useState<Row | null>(null);
  const [declineNote, setDeclineNote] = useState("");

  const approve = async (row: Row) => {
    setActing(row.id);
    try {
      const res = await api.deviceMoveApprove(row.id);
      toast({
        title: "Move approved",
        description: res.emailed
          ? `${row.email} has been emailed and can now pay for the move.`
          : `${row.email} can now pay for the move, but the email did not send — they will see it in the app.`,
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
      const res = await api.deviceMoveReject(row.id, declineNote.trim());
      toast({
        title: "Move declined",
        description: res.emailed
          ? `${row.email} has been told why.`
          : `${row.email} will see the reason in the app, but the email did not send.`,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          Every device move needs approval before it can be paid for. Each request is from someone
          who has already proved they can read the licence's mailbox. Reply quickly: they are
          waiting in the app.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
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
              ? "A request appears here once the user has entered the emailed code. Requests nobody answers lapse after 72 hours."
              : "Approved and declined requests show up here, newest first."
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Panel
              key={r.id}
              title={r.email}
              description={`Asked ${relative(r.requestedAt)} · ${dateTime(r.requestedAt)}`}
              action={
                r.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
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
                      Approve
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant={r.status === "approved" ? "secondary" : "destructive"}
                    className="font-normal"
                  >
                    {STATUS_LABEL[r.status]}
                    {r.status === "approved" && (r.paid ? " · moved" : " · not paid yet")}
                  </Badge>
                )
              }
            >
              <div className="space-y-4">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Their reason
                  </Label>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">
                    {r.reason ?? "—"}
                  </p>
                </div>

                <dl className="grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Licence is on</dt>
                    <dd className="font-mono text-[12.5px]" title={r.currentDeviceId ?? ""}>
                      {shortId(r.currentDeviceId, 5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Asking to move to</dt>
                    <dd className="font-mono text-[12.5px]" title={r.targetDeviceId}>
                      {shortId(r.targetDeviceId, 5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Moves in the last year</dt>
                    <dd className={r.movesLastYear > 0 ? "font-medium text-destructive" : ""}>
                      {r.movesLastYear} of 2
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Licensed since</dt>
                    <dd>{r.licensedSince ? dateTime(r.licensedSince) : "—"}</dd>
                  </div>
                </dl>

                {r.history.length > 0 && (
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Device history
                    </Label>
                    <ul className="mt-1 space-y-1 text-[12.5px] text-muted-foreground">
                      {r.history.map((h, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{h.event}</span> ·{" "}
                          {dateTime(h.at)}
                          {h.note ? ` · ${h.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.status !== "pending" && (
                  <p className="text-[12.5px] text-muted-foreground">
                    {STATUS_LABEL[r.status]} by {r.decidedBy ?? "—"} on {dateTime(r.decidedAt)}
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
            <DialogTitle>Decline this move?</DialogTitle>
            <DialogDescription>
              {declining?.email} stays on their current phone and cannot ask again for 24 hours.
              They cannot reply from the app, so tell them what to do next.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="decline-note">Message to the user</Label>
            <Textarea
              id="decline-note"
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="e.g. We could not match this to a lost or replaced phone. Email support with proof of purchase."
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
              Decline move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
