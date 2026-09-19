import { useMemo, useState } from "react";
import { Check, Loader2, PackagePlus, RefreshCw, X } from "lucide-react";
import { api } from "@/lib/api";
import { relative } from "@/lib/format";
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

/**
 * Mentors who have hit their licence-key quota land here asking for more.
 *
 * Approving edits `profiles.license_quota` on the service role (through
 * admin-approve-mentor's `request.decide` action) -- the quota is additive,
 * so approving a request for 100 more keys raises whatever the mentor already
 * had rather than resetting it. Declining leaves the quota untouched and just
 * records the decision, so a mentor cannot resubmit the same ask indefinitely
 * without an admin noticing it already has an answer.
 */
export default function KeyRequests() {
  const { data, error, loading, reload } = useAsync(() => api.keyRequestsList(), []);
  const { toast } = useToast();
  const [deciding, setDeciding] = useState<string | null>(null);
  // How many to actually grant per pending row, defaulted to what was asked
  // but editable -- an admin might reasonably grant less than a very large ask.
  const [grantDrafts, setGrantDrafts] = useState<Record<string, number>>({});

  const rows = data?.rows ?? [];
  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const decided = useMemo(() => rows.filter((r) => r.status !== "pending"), [rows]);

  const grantFor = (id: string, fallback: number) => grantDrafts[id] ?? fallback;

  const decide = async (id: string, mentorLabel: string, decision: "approved" | "declined", granted?: number) => {
    setDeciding(id);
    try {
      const result = await api.keyRequestDecide(id, decision, decision === "approved" ? granted : undefined);
      toast({
        title: decision === "approved" ? "Request approved" : "Request declined",
        description:
          decision === "approved"
            ? result.quota !== null
              ? `${mentorLabel} can now hold ${result.quota} keys.`
              : `${mentorLabel} already has an unlimited quota; nothing to add.`
            : `${mentorLabel} was told this request was declined.`,
      });
      reload();
    } catch (err) {
      toast({
        title: `Could not ${decision === "approved" ? "approve" : "decline"}`,
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setDeciding(null);
    }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          A mentor sees this the moment generating a key would put them over quota. Approving adds
          the granted amount to whatever quota they already have.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          loading={loading}
          label="Waiting"
          value={pending.length}
          icon={PackagePlus}
          tone={pending.length ? "warn" : "good"}
        />
        <Stat
          loading={loading}
          label="Approved"
          value={rows.filter((r) => r.status === "approved").length}
        />
        <Stat
          loading={loading}
          label="Declined"
          value={rows.filter((r) => r.status === "declined").length}
        />
      </div>

      <Panel title="Waiting for a decision">
        {loading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : !pending.length ? (
          <Empty title="Nothing waiting" body="Every key request has been decided." />
        ) : (
          <div className="space-y-3">
            {pending.map((r) => {
              const mentorLabel = r.mentorName || r.mentorEmail || "This mentor";
              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{mentorLabel}</span>
                      <Badge variant="outline" className="font-normal">
                        Asked for {r.requested}
                      </Badge>
                    </div>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {r.mentorEmail ?? "no email"}
                    </p>
                    {r.reason && (
                      <p className="text-[13px] text-foreground/90">&ldquo;{r.reason}&rdquo;</p>
                    )}
                    <p className="text-[12px] text-muted-foreground">
                      Requested {relative(r.createdAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`grant-${r.id}`} className="text-[11px] text-muted-foreground">
                        Grant
                      </Label>
                      <Input
                        id={`grant-${r.id}`}
                        type="number"
                        min={1}
                        value={grantFor(r.id, r.requested)}
                        onChange={(e) =>
                          setGrantDrafts((prev) => ({
                            ...prev,
                            [r.id]: Math.max(1, Math.floor(Number(e.target.value)) || 1),
                          }))
                        }
                        className="h-8 w-24 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={deciding === r.id}
                      onClick={() =>
                        void decide(r.id, mentorLabel, "approved", grantFor(r.id, r.requested))
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
                      onClick={() => void decide(r.id, mentorLabel, "declined")}
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Already decided">
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : !decided.length ? (
          <Empty title="No decisions yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead className="text-right">Requested</TableHead>
                  <TableHead className="text-right">Granted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decided</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decided.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.mentorName || r.mentorEmail || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{r.requested}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.granted ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "approved" ? "secondary" : "destructive"}
                        className="font-normal capitalize"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {r.decidedAt ? relative(r.decidedAt) : "—"}
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
