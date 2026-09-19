import { useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Send } from "lucide-react";
import { api } from "@/lib/api";
import { relative } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Audience = "app_users" | "mentors" | "everyone";

const AUDIENCE_LABEL: Record<Audience, string> = {
  app_users: "App users",
  mentors: "Mentors",
  everyone: "Everyone",
};

/**
 * A one-off email to app users, mentors, or both.
 *
 * Sending is outward-facing and cannot be undone once Resend has queued it, so
 * this is the one admin screen with a genuine two-step confirm: picking an
 * audience and writing a message only stages the send, and the confirm
 * dialog names the exact recipient count before anything actually goes out.
 */
export default function Broadcast() {
  const { data, error, loading, reload } = useAsync(() => api.broadcastHistory(), []);
  const { toast } = useToast();

  const [audience, setAudience] = useState<Audience>("app_users");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const rows = data?.rows ?? [];

  // Recount every time the audience changes, so the confirm dialog is never
  // showing a stale number from a previous choice.
  useEffect(() => {
    let cancelled = false;
    setCountLoading(true);
    setCount(null);
    api
      .broadcastAudienceCount(audience)
      .then((r) => { if (!cancelled) setCount(r.count); })
      .catch(() => { if (!cancelled) setCount(null); })
      .finally(() => { if (!cancelled) setCountLoading(false); });
    return () => { cancelled = true; };
  }, [audience]);

  const canStage = subject.trim().length > 0 && body.trim().length > 0 && (count ?? 0) > 0;

  const send = async () => {
    setSending(true);
    try {
      const result = await api.broadcastSend(audience, subject.trim(), body.trim());
      toast({
        title: "Broadcast sent",
        description:
          result.failedCount > 0
            ? `${result.sentCount} of ${result.recipientCount} delivered, ${result.failedCount} failed. Check the function logs.`
            : `Sent to all ${result.sentCount} recipients.`,
      });
      setSubject("");
      setBody("");
      setConfirmOpen(false);
      reload();
    } catch (err) {
      toast({
        title: "Could not send",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <p className="max-w-[70ch] text-[13px] text-muted-foreground">
        Sends one email to every address in the chosen audience through Resend. There is no
        preview send and no undo once it is away, so the confirm step names exactly who
        receives it.
      </p>

      <Panel title="New broadcast">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="app_users">App users</SelectItem>
                  <SelectItem value="mentors">Mentors</SelectItem>
                  <SelectItem value="everyone">Everyone</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[12px] text-muted-foreground">
                {countLoading ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Counting…
                  </span>
                ) : (
                  `${count ?? 0} recipient${count === 1 ? "" : "s"}`
                )}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-subject" className="text-[12px] text-muted-foreground">
                Subject
              </Label>
              <Input
                id="broadcast-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Scheduled maintenance this Sunday"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-body" className="text-[12px] text-muted-foreground">
              Message
            </Label>
            <Textarea
              id="broadcast-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="The portal will be offline for about 30 minutes from 02:00 SAST while we apply an update."
              rows={6}
            />
            <p className="text-[11.5px] text-muted-foreground">
              Plain text only — it is wrapped in the standard NovaHost email layout automatically.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              className="gap-1.5"
              disabled={!canStage || sending}
              onClick={() => setConfirmOpen(true)}
            >
              <Mail className="h-3.5 w-3.5" />
              Review &amp; send
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="History"
        action={
          <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </Button>
        }
      >
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : !rows.length ? (
          <Empty title="Nothing sent yet" body="Every broadcast you send is logged here." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[320px] truncate font-medium">{r.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {AUDIENCE_LABEL[r.audience]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.sentCount} / {r.recipientCount}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.failedCount > 0 ? (
                        <span className="text-destructive">{r.failedCount}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {relative(r.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !sending && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send &ldquo;{subject}&rdquo; to {count ?? 0} {AUDIENCE_LABEL[audience].toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This goes out immediately and cannot be recalled. Double-check the audience and the
              message above before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
