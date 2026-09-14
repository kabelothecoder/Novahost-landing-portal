import { useState } from "react";
import { AlertTriangle, Loader2, Plus, RefreshCw, TestTube2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { date, dateTime, money } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Kind = "refund" | "chargeback" | "correction";

const KIND_LABEL: Record<Kind, string> = {
  refund: "Refund",
  chargeback: "Chargeback",
  correction: "Correction",
};

/**
 * The exceptions page: everything that would otherwise quietly distort the
 * revenue figures, plus the ledger that corrects them.
 *
 * Sandbox rows are shown rather than deleted. They are real rows in `itn_logs`
 * and pretending otherwise would leave someone wondering why the log has five
 * entries and the revenue page counts three.
 */
export default function Payments() {
  const { data, error, loading, reload } = useAsync(() => api.revenue(), []);
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<Kind>("refund");
  const [pfPaymentId, setPfPaymentId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!email.trim().includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Amount must be a positive number", variant: "destructive" });
      return;
    }
    if (!note.trim()) {
      toast({
        title: "Add a note",
        description: "An unexplained adjustment to a revenue figure is worse than none.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await api.createAdjustment({
        email: email.trim().toLowerCase(),
        amount: value,
        kind,
        note: note.trim(),
        pfPaymentId: pfPaymentId.trim() || null,
      });
      toast({
        title: `${KIND_LABEL[kind]} recorded`,
        description: `${money(value)} against ${email.trim().toLowerCase()}.`,
      });
      setEmail("");
      setAmount("");
      setPfPaymentId("");
      setNote("");
      reload();
    } catch (err) {
      toast({
        title: "Could not record it",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeleting(true);
    try {
      await api.deleteAdjustment(id);
      toast({ title: "Adjustment deleted" });
      reload();
    } catch (err) {
      toast({
        title: "Could not delete it",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;

  const adjustments = data?.adjustments ?? [];
  const sandbox = data?.sandbox ?? [];
  const failed = data?.failed ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          Money that went back out, and payments that never counted as money coming in.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          loading={loading}
          label="Refunded"
          value={money(data?.revenue.refundTotal ?? 0, true)}
          hint={`${adjustments.length} adjustment${adjustments.length === 1 ? "" : "s"}`}
          tone={adjustments.length ? "warn" : "default"}
        />
        <Stat
          loading={loading}
          label="Sandbox payments"
          value={sandbox.length}
          hint="Excluded from revenue"
          icon={TestTube2}
        />
        <Stat
          loading={loading}
          label="Incomplete"
          value={failed.length}
          hint="Live but not COMPLETE"
          tone={failed.length ? "warn" : "default"}
        />
        <Stat
          loading={loading}
          label="Duplicate ITNs"
          value={data?.duplicates ?? 0}
          hint="Same PayFast id twice"
          tone={data?.duplicates ? "bad" : "good"}
        />
      </div>

      {/* ── Record an adjustment ── */}
      <Panel
        title="Record an adjustment"
        description="Subtracted from revenue immediately. There is no edit — delete and re-enter to correct one."
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="adj-email">Email</Label>
            <Input
              id="adj-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-kind">Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger id="adj-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="chargeback">Chargeback</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-amount">Amount (R)</Label>
            <Input
              id="adj-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="599.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-pf">PayFast id (optional)</Label>
            <Input
              id="adj-pf"
              value={pfPaymentId}
              onChange={(e) => setPfPaymentId(e.target.value)}
              placeholder="327722021"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="adj-note">Why</Label>
            <Input
              id="adj-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Refunded on request — could not connect their broker"
            />
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Record
            </Button>
          </div>
        </form>
      </Panel>

      {/* ── The ledger ── */}
      <Panel title="Adjustment ledger">
        {loading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : !adjustments.length ? (
          <Empty
            title="No adjustments recorded"
            body="Nothing has been refunded or corrected, so gross and realised revenue differ only by PayFast's fees."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {date(a.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-medium">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal capitalize">
                        {a.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-destructive">
                      &minus;{money(a.amount)}
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate text-muted-foreground">
                      {a.note}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete adjustment"
                        onClick={() => setConfirmDelete(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      {/* ── Quarantined sandbox rows ── */}
      <Panel
        title="Sandbox payments"
        description={
          data
            ? `Recorded against a different merchant id to the live account (${data.liveMerchantId}). Kept for the record, never counted.`
            : undefined
        }
      >
        {loading ? (
          <TableSkeleton rows={2} cols={4} />
        ) : !sandbox.length ? (
          <Empty title="No sandbox rows" body="Every payment in the log is against the live merchant." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead>Merchant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sandbox.map((p) => (
                  <TableRow key={p.id} className="opacity-70">
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {date(p.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{p.email ?? "—"}</TableCell>
                    <TableCell>{p.productLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.gross)}</TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">
                      {p.merchantId ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      {/* ── Live but not complete ── */}
      {!loading && failed.length > 0 && (
        <Panel
          title="Incomplete live payments"
          description="An ITN arrived on the live merchant without a COMPLETE status. No entitlement was granted."
        >
          <div className="mb-3 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/[0.07] px-3 py-2 text-[12.5px] text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
            Worth checking against PayFast before assuming the customer was not charged.
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failed.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dateTime(p.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{p.email ?? "—"}</TableCell>
                    <TableCell>{p.productLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.gross)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="font-normal">
                        {p.status ?? "unknown"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              Revenue goes back up by that amount. There is no undo, and no record that the
              adjustment ever existed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) void remove(confirmDelete);
              }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
