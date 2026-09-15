import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  FileText,
  Landmark,
  Loader2,
  Percent,
  RefreshCw,
  UserCheck,
  X,
} from "lucide-react";
import { api, type AgreementRow } from "@/lib/api";
import { date, money } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Signed mentor agreements wait here.
 *
 * Approving one is the moment a mentor becomes entitled to commission, so the
 * things worth checking are in the row: which option they chose, the bank
 * account the money will go to, and the signed PDF itself. The account number
 * is shown in full on this screen and nowhere else in the product — somebody
 * has to type it into a banking app.
 *
 * The rate and target are stamped onto the agreement at approval. Changing the
 * programme terms later cannot rewrite what a mentor already signed, which is
 * why they are fields on this dialog and not looked up at payout time.
 */

const STATUS_TONE: Record<string, string> = {
  approved: "bg-success text-success-foreground hover:bg-success",
  submitted: "bg-warning text-warning-foreground hover:bg-warning",
  rejected: "bg-destructive text-destructive-foreground hover:bg-destructive",
  draft: "",
};

const OPTION_LABEL: Record<string, string> = {
  A: "A — Giveaway & target",
  B: "B — Direct sales",
};

/** One labelled fact in the detail grid. */
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-[13px]">{value ?? "—"}</p>
    </div>
  );
}

/** The month just gone, which is what a payout is usually raised for. */
function lastMonth(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function Agreements() {
  const { data, error, loading, reload } = useAsync(() => api.agreementsList(), []);
  const { toast } = useToast();

  const [reviewing, setReviewing] = useState<AgreementRow | null>(null);
  const [payoutFor, setPayoutFor] = useState<AgreementRow | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.agreements ?? [];
  const waiting = useMemo(() => rows.filter((r) => r.status === "submitted"), [rows]);
  const approved = useMemo(() => rows.filter((r) => r.status === "approved"), [rows]);
  const other = useMemo(
    () => rows.filter((r) => r.status !== "submitted" && r.status !== "approved"),
    [rows],
  );

  const openDocument = async (mentorId: string) => {
    try {
      const res = await api.agreementDocumentUrl(mentorId);
      if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        title: "Could not open the document",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;

  const Row = ({ row, actions }: { row: AgreementRow; actions?: React.ReactNode }) => (
    <TableRow>
      <TableCell>
        <p className="font-medium">{row.mentorName}</p>
        <p className="text-[12px] text-muted-foreground">{row.mentorEmail ?? row.email ?? "—"}</p>
      </TableCell>
      <TableCell className="text-[12.5px]">
        {row.commissionOption ? OPTION_LABEL[row.commissionOption] : "—"}
        {row.commissionRate != null && (
          <span className="block text-[12px] text-muted-foreground">
            {Math.round(row.commissionRate * 100)}% after {row.qualifyingTarget} keys
          </span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.qualifyingKeys}
        <span className="text-muted-foreground">/{row.keysIssued}</span>
      </TableCell>
      <TableCell className="text-[12.5px] text-muted-foreground">
        {row.status === "submitted" ? date(row.submittedAt) : date(row.reviewedAt)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          {row.hasDocument && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void openDocument(row.mentorId)}
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
          )}
          {actions}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[72ch] text-[13px] text-muted-foreground">
          Approving an agreement makes a mentor entitled to commission at the rate you stamp on it.
          Check the signed PDF and the bank account before you do.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          loading={loading}
          label="Waiting for review"
          value={waiting.length}
          icon={UserCheck}
          tone={waiting.length ? "warn" : "good"}
        />
        <Stat loading={loading} label="On commission" value={approved.length} icon={Percent} />
        <Stat loading={loading} label="Not submitted or rejected" value={other.length} />
      </div>

      <Tabs defaultValue="waiting">
        <TabsList>
          <TabsTrigger value="waiting">
            Waiting{waiting.length > 0 ? ` (${waiting.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="approved">On commission</TabsTrigger>
          <TabsTrigger value="other">Everyone else</TabsTrigger>
        </TabsList>

        <TabsContent value="waiting" className="mt-4">
          <Panel title="Submitted agreements" description="Newest first">
            {loading ? (
              <TableSkeleton rows={3} cols={5} />
            ) : waiting.length === 0 ? (
              <Empty
                title="Nothing waiting"
                body="A mentor appears here the moment they send a signed agreement for review."
              />
            ) : (
              <div className="space-y-4">
                {waiting.map((row) => (
                  <div key={row.mentorId} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold">{row.mentorName}</p>
                        <p className="text-[12.5px] text-muted-foreground">
                          {row.mentorEmail ?? "—"} · sent {date(row.submittedAt)} · agreement{" "}
                          {row.agreementVersion ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {row.hasDocument ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => void openDocument(row.mentorId)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Open the signed PDF
                          </Button>
                        ) : (
                          <Badge variant="outline" className="font-normal text-destructive">
                            No document
                          </Badge>
                        )}
                        <Button size="sm" onClick={() => setReviewing(row)} className="gap-1.5">
                          <Check className="h-3.5 w-3.5" />
                          Review
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-4">
                      <Detail
                        label="Option"
                        value={row.commissionOption ? OPTION_LABEL[row.commissionOption] : "—"}
                      />
                      <Detail label="Paid" value={row.payoutFrequency ?? "—"} />
                      <Detail label="Signed on" value={date(row.signedOn)} />
                      <Detail label="Name on the agreement" value={row.fullName} />
                      <Detail label="Phone" value={row.phone} />
                      <Detail
                        label="Sales so far"
                        value={`${row.qualifyingKeys} of ${row.keysIssued} keys`}
                      />
                    </div>

                    <div className="mt-4 grid gap-4 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-3 lg:grid-cols-5">
                      <div className="sm:col-span-3 lg:col-span-5">
                        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Landmark className="h-3 w-3" />
                          Where commission will be paid
                        </p>
                      </div>
                      <Detail label="Bank" value={row.bankName} />
                      <Detail label="Account holder" value={row.accountHolder} />
                      <Detail
                        label="Account number"
                        value={
                          row.accountNumber ? (
                            <span className="tabular-nums">{row.accountNumber}</span>
                          ) : null
                        }
                      />
                      <Detail label="Type" value={row.accountType} />
                      <Detail label="Branch code" value={row.branchCode} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <Panel
            title="Mentors on commission"
            description="Raise a payout against the period you are settling"
          >
            {loading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : approved.length === 0 ? (
              <Empty
                title="Nobody is on commission yet"
                body="Approve a submitted agreement and the mentor appears here."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Terms</TableHead>
                      <TableHead className="text-right">Sold / issued</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approved.map((row) => (
                      <Row
                        key={row.mentorId}
                        row={row}
                        actions={
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setPayoutFor(row)}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Payout
                          </Button>
                        }
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="other" className="mt-4">
          <Panel title="Drafts and rejections">
            {loading ? (
              <TableSkeleton rows={3} cols={5} />
            ) : other.length === 0 ? (
              <Empty title="Nothing here" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Option</TableHead>
                      <TableHead className="text-right">Sold / issued</TableHead>
                      <TableHead>Last change</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {other.map((row) => (
                      <TableRow key={row.mentorId}>
                        <TableCell>
                          <p className="font-medium">{row.mentorName}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {row.mentorEmail ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-[12.5px]">
                          {row.commissionOption ? OPTION_LABEL[row.commissionOption] : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.qualifyingKeys}
                          <span className="text-muted-foreground">/{row.keysIssued}</span>
                        </TableCell>
                        <TableCell className="text-[12.5px] text-muted-foreground">
                          {date(row.reviewedAt ?? row.submittedAt)}
                          {row.reviewNote && (
                            <span className="block max-w-[40ch] truncate">{row.reviewNote}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className={cn("font-normal", STATUS_TONE[row.status])}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      {reviewing && (
        <ReviewDialog
          row={reviewing}
          defaults={data?.defaults}
          busy={busy}
          onClose={() => setReviewing(null)}
          onDecide={async (decision, note, rate, target) => {
            setBusy(true);
            try {
              await api.agreementDecide({
                mentorId: reviewing.mentorId,
                decision,
                note: note || undefined,
                commissionRate: decision === "approve" ? rate : undefined,
                qualifyingTarget: decision === "approve" ? target : undefined,
              });
              toast({
                title: decision === "approve" ? "Agreement approved" : "Agreement sent back",
                description:
                  decision === "approve"
                    ? `${reviewing.mentorName} is now on commission at ${Math.round((rate ?? 0) * 100)}%.`
                    : `${reviewing.mentorName} can edit and resubmit.`,
              });
              setReviewing(null);
              reload();
            } catch (err) {
              toast({
                title: "Could not save that decision",
                description: err instanceof Error ? err.message : String(err),
                variant: "destructive",
              });
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {payoutFor && (
        <PayoutDialog
          row={payoutFor}
          busy={busy}
          onClose={() => setPayoutFor(null)}
          onRaise={async (periodStart, periodEnd, reference) => {
            setBusy(true);
            try {
              const res = await api.payoutCreate({
                mentorId: payoutFor.mentorId,
                periodStart,
                periodEnd,
                reference: reference || undefined,
              });
              toast({
                title: "Payout raised",
                description: `${res.qualifyingKeys} keys, ${money(res.grossRevenue)} of sales, ${money(res.amount)} due. It shows on the mentor's page as pending.`,
              });
              setPayoutFor(null);
              reload();
            } catch (err) {
              toast({
                title: "Could not raise that payout",
                description: err instanceof Error ? err.message : String(err),
                variant: "destructive",
              });
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReviewDialog({
  row,
  defaults,
  busy,
  onClose,
  onDecide,
}: {
  row: AgreementRow;
  defaults?: {
    optionARate: number;
    optionATarget: number;
    optionBRate: number;
    optionBTarget: number;
  };
  busy: boolean;
  onClose: () => void;
  onDecide: (
    decision: "approve" | "reject",
    note: string,
    rate?: number,
    target?: number,
  ) => Promise<void>;
}) {
  const isA = row.commissionOption === "A";
  const [rate, setRate] = useState(
    String(Math.round(((isA ? defaults?.optionARate : defaults?.optionBRate) ?? 0.15) * 100)),
  );
  const [target, setTarget] = useState(
    String((isA ? defaults?.optionATarget : defaults?.optionBTarget) ?? 10),
  );
  const [note, setNote] = useState("");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review {row.mentorName}&rsquo;s agreement</DialogTitle>
          <DialogDescription>
            Approving stamps these terms onto the agreement. Changing the programme later will not
            rewrite them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Commission rate</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={rate}
                  inputMode="numeric"
                  onChange={(e) => setRate(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <span className="text-[12.5px] text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">
                Qualifying target{isA ? "" : " per month"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={target}
                  inputMode="numeric"
                  onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <span className="text-[12.5px] text-muted-foreground">keys</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px]">
              Note to the mentor{" "}
              <span className="font-normal text-muted-foreground">
                (required if you send it back)
              </span>
            </Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="The bank account name does not match the name you signed with — please re-upload."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            disabled={busy || !note.trim()}
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => void onDecide("reject", note)}
          >
            <X className="h-3.5 w-3.5" />
            Send it back
          </Button>
          <Button
            disabled={busy}
            className="gap-1.5"
            onClick={() =>
              void onDecide("approve", note, Number(rate) / 100, Number(target))
            }
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Approve at {rate || 0}%
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayoutDialog({
  row,
  busy,
  onClose,
  onRaise,
}: {
  row: AgreementRow;
  busy: boolean;
  onClose: () => void;
  onRaise: (periodStart: string, periodEnd: string, reference: string) => Promise<void>;
}) {
  const initial = lastMonth();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [reference, setReference] = useState("");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raise a payout for {row.mentorName}</DialogTitle>
          <DialogDescription>
            The keys and the amount are counted from the sales themselves, not typed in. The payout
            records what was counted at this moment, so a refund landing later cannot rewrite it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">From</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">To (inclusive)</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Your payment reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="EFT reference"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[12.5px] text-muted-foreground">
            Paying at {row.commissionRate != null ? Math.round(row.commissionRate * 100) : "—"}% of
            qualifying sales, to {row.bankName ?? "the account on file"}{" "}
            {row.accountNumber ? `· ${row.accountNumber}` : ""}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy || !start || !end}
            className="gap-1.5"
            onClick={() => void onRaise(start, end, reference)}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Banknote className="h-3.5 w-3.5" />
            )}
            Count it and raise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
