import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import { api, type WebsiteRow } from "@/lib/api";
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
import { cn } from "@/lib/utils";

/**
 * Free-website requests from mentors past the qualifying-key threshold.
 *
 * Each card is everything needed to build the page: the robot, the address, the
 * copy, the broker links the mentor earns from, their community, and the
 * results they want shown. The eligibility is re-checked here and not just at
 * submission — the threshold can be changed, and a request that was earned
 * under an old one should be visible as such rather than silently pass.
 */

/**
 * The states an admin can move a request INTO. "requested" is not one of them:
 * only the mentor can put a request into that state, by sending it.
 */
type Decision = Exclude<WebsiteRow["status"], "requested">;

const STATUS: Record<WebsiteRow["status"], { label: string; tone: string; next: Decision[] }> = {
  requested: {
    label: "Requested",
    tone: "bg-warning text-warning-foreground hover:bg-warning",
    next: ["in_review", "rejected"],
  },
  in_review: {
    label: "Being reviewed",
    tone: "bg-warning text-warning-foreground hover:bg-warning",
    next: ["approved", "rejected"],
  },
  approved: { label: "Approved", tone: "", next: ["building", "rejected"] },
  building: { label: "Being built", tone: "", next: ["live", "rejected"] },
  live: { label: "Live", tone: "bg-success text-success-foreground hover:bg-success", next: [] },
  rejected: {
    label: "Sent back",
    tone: "bg-destructive text-destructive-foreground hover:bg-destructive",
    next: ["in_review"],
  },
};

const NEXT_LABEL: Record<string, string> = {
  in_review: "Start reviewing",
  approved: "Approve it",
  building: "Mark as being built",
  live: "Publish it",
  rejected: "Send it back",
};

function LinkList({
  title,
  icon: Icon,
  items,
  render,
}: {
  title: string;
  icon: typeof Link2;
  items: Array<Record<string, string>>;
  render: (item: Record<string, string>) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-[12.5px]">
            {render(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Websites() {
  const { data, error, loading, reload } = useAsync(() => api.websitesList(), []);
  const { toast } = useToast();
  const [deciding, setDeciding] = useState<{ row: WebsiteRow; to: Decision } | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.websites ?? [];
  const open = useMemo(
    () => rows.filter((r) => !["live", "rejected"].includes(r.status)),
    [rows],
  );
  const closed = useMemo(
    () => rows.filter((r) => ["live", "rejected"].includes(r.status)),
    [rows],
  );

  if (error) return <LoadError error={error} onRetry={reload} />;

  const Card = ({ row }: { row: WebsiteRow }) => {
    const s = STATUS[row.status];
    const earned = row.qualifyingKeys >= row.threshold;

    return (
      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-semibold">{row.mentorName}</p>
              <Badge variant="secondary" className={cn("font-normal", s.tone)}>
                {s.label}
              </Badge>
              {!earned && (
                <Badge variant="outline" className="gap-1 font-normal text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {row.qualifyingKeys} of {row.threshold} keys
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {row.robotName ?? "No robot chosen"}
              {row.subdomain ? ` · ${row.subdomain}.novahost-ea.app` : ""} · requested{" "}
              {date(row.requestedAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {row.liveUrl && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <a href={row.liveUrl} target="_blank" rel="noopener noreferrer">
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {s.next.map((to) => (
              <Button
                key={to}
                size="sm"
                variant={to === "rejected" ? "outline" : "default"}
                className={cn("gap-1.5", to === "rejected" && "text-destructive hover:text-destructive")}
                onClick={() => setDeciding({ row, to })}
              >
                {NEXT_LABEL[to]}
              </Button>
            ))}
          </div>
        </div>

        {(row.headline || row.tagline || row.about) && (
          <div className="mt-4 border-t border-border pt-4">
            {row.headline && <p className="text-[14px] font-medium">{row.headline}</p>}
            {row.tagline && (
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">{row.tagline}</p>
            )}
            {row.about && (
              <p className="mt-2 max-w-[80ch] whitespace-pre-wrap text-[12.5px] text-muted-foreground">
                {row.about}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <LinkList
            title="Broker links"
            icon={Link2}
            items={row.brokerLinks}
            render={(b) => (
              <>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary hover:underline"
                >
                  {b.label || b.url}
                </a>
                {b.note && <span className="block text-muted-foreground">{b.note}</span>}
              </>
            )}
          />
          <LinkList
            title="Community"
            icon={Users}
            items={row.groupLinks}
            render={(g) => (
              <a
                href={g.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-primary hover:underline"
              >
                {g.label || g.platform || g.url}
              </a>
            )}
          />
          <LinkList
            title="Results"
            icon={ImageIcon}
            items={row.results}
            render={(r) => (
              <span className="text-muted-foreground">
                {r.caption || "Untitled"}
                {r.posted_on ? ` · ${r.posted_on}` : ""}
                {r.path ? " · image attached" : ""}
              </span>
            )}
          />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Money
            </p>
            <p className="mt-1.5 text-[12.5px]">
              {row.priceZar != null ? `Asking ${money(row.priceZar)}` : "No price requested"}
            </p>
            <p className="text-[12.5px] text-muted-foreground">
              Settle by {row.payoutMethod ?? "—"}
              {row.payoutDetail ? ` · ${row.payoutDetail}` : ""}
            </p>
          </div>
        </div>

        {row.reviewNote && (
          <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-[12.5px] text-muted-foreground">
            {row.reviewNote}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[72ch] text-[13px] text-muted-foreground">
          Mentors past the qualifying-key threshold can ask for a landing page for their robot. Each
          request carries everything needed to build it.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          loading={loading}
          label="Open requests"
          value={open.length}
          icon={Globe}
          tone={open.length ? "warn" : "good"}
        />
        <Stat
          loading={loading}
          label="Live"
          value={rows.filter((r) => r.status === "live").length}
          tone="good"
        />
        <Stat
          loading={loading}
          label="Sent back"
          value={rows.filter((r) => r.status === "rejected").length}
        />
      </div>

      <Panel title="Open requests" description="Newest first">
        {loading ? (
          <TableSkeleton rows={2} cols={4} />
        ) : open.length === 0 ? (
          <Empty
            title="No open requests"
            body="A mentor appears here once they pass the threshold and send their page details."
          />
        ) : (
          <div className="space-y-4">
            {open.map((row) => (
              <Card key={row.id} row={row} />
            ))}
          </div>
        )}
      </Panel>

      {closed.length > 0 && (
        <Panel title="Published and rejected">
          <div className="space-y-4">
            {closed.map((row) => (
              <Card key={row.id} row={row} />
            ))}
          </div>
        </Panel>
      )}

      {deciding && (
        <DecideDialog
          row={deciding.row}
          to={deciding.to}
          busy={busy}
          onClose={() => setDeciding(null)}
          onConfirm={async (note, liveUrl) => {
            setBusy(true);
            try {
              await api.websiteDecide({
                websiteId: deciding.row.id,
                decision: deciding.to,
                note: note || undefined,
                liveUrl: liveUrl || undefined,
              });
              toast({
                title: "Request updated",
                description: `${deciding.row.mentorName}'s page is now "${STATUS[deciding.to].label}".`,
              });
              setDeciding(null);
              reload();
            } catch (err) {
              toast({
                title: "Could not update that request",
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

function DecideDialog({
  row,
  to,
  busy,
  onClose,
  onConfirm,
}: {
  row: WebsiteRow;
  to: Decision;
  busy: boolean;
  onClose: () => void;
  onConfirm: (note: string, liveUrl: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [liveUrl, setLiveUrl] = useState(
    row.subdomain ? `https://${row.subdomain}.novahost-ea.app` : "",
  );
  const needsNote = to === "rejected";
  const needsUrl = to === "live";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {NEXT_LABEL[to]} — {row.mentorName}
          </DialogTitle>
          <DialogDescription>
            {needsUrl
              ? "The mentor sees this address on their Web Builder page as soon as you publish."
              : needsNote
                ? "Say what needs fixing. The mentor sees this and can edit and resend."
                : "The mentor sees the new status on their Web Builder page."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {needsUrl && (
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Live address</Label>
              <Input
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">
              Note to the mentor
              {needsNote && <span className="text-muted-foreground"> (required)</span>}
            </Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={
                needsNote
                  ? "The results screenshots need captions before we can publish them."
                  : "Optional"
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy || (needsNote && !note.trim()) || (needsUrl && !liveUrl.trim())}
            className="gap-1.5"
            onClick={() => void onConfirm(note, liveUrl)}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {NEXT_LABEL[to]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
