import { useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Mail,
  MailCheck,
  MailWarning,
  RefreshCw,
  UserCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { date, relative } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/** A signup link, rendered only when the mentor supplied one. */
function VettingLink({ label, href }: { label: string; href: string | null }) {
  if (!href) return null;
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

/**
 * Mentor signups wait here.
 *
 * Every new mentor account starts `pending` and cannot use the portal until an
 * admin approves it. This screen is the only place that decision gets made, and
 * approving is the moment somebody gains the ability to issue licence keys and
 * send trades to other people's accounts — so the social links they gave at
 * signup are shown right in the row, because that is what you actually vet on.
 */
export default function Approvals() {
  const { data, error, loading, reload } = useAsync(() => api.approvalsList(), []);
  const { toast } = useToast();
  const [deciding, setDeciding] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  // Starting key quota per pending row, editable before approving. Kept in a
  // map rather than one shared value since more than one signup can be
  // waiting at once and each may deserve a different starting allowance.
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, number>>({});
  const quotaFor = (id: string) => quotaDrafts[id] ?? 50;
  const [notifyConfirmOpen, setNotifyConfirmOpen] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const rows = data?.rows ?? [];
  const pending = useMemo(() => rows.filter((r) => r.approvalStatus === "pending"), [rows]);
  const decided = useMemo(() => rows.filter((r) => r.approvalStatus !== "pending"), [rows]);
  const approvedCount = useMemo(
    () => rows.filter((r) => r.approvalStatus === "approved").length,
    [rows],
  );

  const notifyApproved = async () => {
    setIsNotifying(true);
    try {
      const result = await api.notifyApprovedMentors();
      toast({
        title: "Notification sent",
        description:
          result.skipped > 0
            ? `Emailed ${result.notified} of ${result.total} approved mentors. ${result.skipped} could not be reached — check Resend is configured.`
            : `Emailed all ${result.notified} approved mentors.`,
      });
    } catch (err) {
      toast({
        title: "Could not send notifications",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setIsNotifying(false);
      setNotifyConfirmOpen(false);
    }
  };

  const decide = async (
    id: string,
    label: string,
    action: "approve" | "reject",
    quota?: number,
  ) => {
    setDeciding(id);
    try {
      const result = await api.approvalsDecide(id, action, undefined, action === "approve" ? quota : undefined);
      const mailNote = result.emailed
        ? ""
        : " (their email could not be sent — mail is not fully configured yet)";
      toast({
        title: action === "approve" ? "Mentor approved" : "Mentor rejected",
        description:
          (action === "approve"
            ? `${label} can now use the portal, with a quota of ${quota} keys.`
            : `${label} stays locked out.`) + mailNote,
      });
      reload();
    } catch (err) {
      toast({
        title: `Could not ${action}`,
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setDeciding(null);
      setConfirmReject(null);
    }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;

  const rejectTarget = rows.find((r) => r.id === confirmReject);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          Approving a mentor lets them issue licence keys and send trades to other people&rsquo;s
          broker accounts. Vet the links before you do.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={loading || approvedCount === 0}
            onClick={() => setNotifyConfirmOpen(true)}
          >
            <Mail className="h-3.5 w-3.5" />
            Notify all approved mentors
          </Button>
          <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          loading={loading}
          label="Waiting"
          value={pending.length}
          icon={UserCheck}
          tone={pending.length ? "warn" : "good"}
        />
        <Stat
          loading={loading}
          label="Approved"
          value={rows.filter((r) => r.approvalStatus === "approved").length}
        />
        <Stat
          loading={loading}
          label="Rejected"
          value={rows.filter((r) => r.approvalStatus === "rejected").length}
        />
      </div>

      <Panel title="Waiting for a decision">
        {loading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : !pending.length ? (
          <Empty title="Nothing waiting" body="Every mentor signup has been decided." />
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {r.displayName || r.fullName || r.email || "Unnamed"}
                    </span>
                    {r.emailVerified ? (
                      <Badge variant="outline" className="gap-1 font-normal text-success">
                        <MailCheck className="h-3 w-3" />
                        Email verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 font-normal text-warning">
                        <MailWarning className="h-3 w-3" />
                        Email unverified
                      </Badge>
                    )}
                  </div>

                  <p className="truncate text-[13px] text-muted-foreground">
                    {r.email ?? "no email"}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <VettingLink label="Instagram" href={r.instagram} />
                    <VettingLink label="TikTok" href={r.tiktok} />
                    <VettingLink label="Telegram" href={r.telegram} />
                    <VettingLink label="WhatsApp" href={r.whatsapp} />
                    {!r.instagram && !r.tiktok && !r.telegram && !r.whatsapp && (
                      <span className="text-[12px] text-muted-foreground">
                        No links given at signup
                      </span>
                    )}
                  </div>

                  <p className="text-[12px] text-muted-foreground">
                    Signed up {relative(r.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`quota-${r.id}`} className="text-[11px] text-muted-foreground">
                      Starting quota
                    </Label>
                    <Input
                      id={`quota-${r.id}`}
                      type="number"
                      min={0}
                      value={quotaFor(r.id)}
                      onChange={(e) =>
                        setQuotaDrafts((prev) => ({
                          ...prev,
                          [r.id]: Math.max(0, Math.floor(Number(e.target.value)) || 0),
                        }))
                      }
                      className="h-8 w-20 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={deciding === r.id}
                    onClick={() =>
                      void decide(r.id, r.email ?? r.displayName ?? "They", "approve", quotaFor(r.id))
                    }
                  >
                    {deciding === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={deciding === r.id}
                    onClick={() => setConfirmReject(r.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Already decided">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : !decided.length ? (
          <Empty title="No decisions yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decided</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decided.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.displayName || r.fullName || "—"}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {r.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.approvalStatus === "approved" ? "secondary" : "destructive"}
                        className="font-normal capitalize"
                      >
                        {r.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {date(r.approvedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <AlertDialog open={Boolean(confirmReject)} onOpenChange={(o) => !o && setConfirmReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reject {rejectTarget?.email ?? rejectTarget?.displayName ?? "this signup"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They keep their account but stay locked out of the portal. You can approve them later
              from this same screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deciding)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deciding)}
              onClick={(e) => {
                e.preventDefault();
                if (rejectTarget) {
                  void decide(
                    rejectTarget.id,
                    rejectTarget.email ?? rejectTarget.displayName ?? "They",
                    "reject",
                  );
                }
              }}
            >
              {deciding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={notifyConfirmOpen} onOpenChange={(o) => !isNotifying && setNotifyConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email all {approvedCount} approved mentors?</AlertDialogTitle>
            <AlertDialogDescription>
              Sends the same "your portal is approved — sign in and generate your license keys"
              message to every currently approved mentor, including ones approved a while ago. Use
              this for a one-time catch-up, not routinely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isNotifying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isNotifying}
              onClick={(e) => {
                e.preventDefault();
                void notifyApproved();
              }}
            >
              {isNotifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
