import { useState } from "react";
import { Gift, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

/**
 * Complimentary access: an admin types an email and that email gets past the
 * paywall without paying, exactly as if a payment had been found.
 *
 * A grant never touches an existing row's `device_id` or session token, so
 * re-granting does not knock somebody's phone off its binding. On a fresh row
 * the device stays null and the first handset to sign in with that email claims
 * it — the same path a paying buyer takes.
 */
export default function CompAccess() {
  const { data, error, loading, reload } = useAsync(() => api.accessList(), []);
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [appAccess, setAppAccess] = useState(true);
  const [scanner, setScanner] = useState(false);
  const [lifetime, setLifetime] = useState(true);
  const [expiry, setExpiry] = useState("");
  const [granting, setGranting] = useState(false);

  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();

    if (!clean.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (!appAccess && !scanner) {
      toast({
        title: "Pick at least one",
        description: "Grant app access, the scanner, or both.",
        variant: "destructive",
      });
      return;
    }
    if (appAccess && !lifetime && !expiry) {
      toast({
        title: "Set an expiry date",
        description: "A time-limited grant needs an end date.",
        variant: "destructive",
      });
      return;
    }

    setGranting(true);
    try {
      await api.accessGrant({
        email: clean,
        appAccess,
        scanner,
        lifetime,
        expiry: lifetime ? null : new Date(expiry).toISOString(),
      });
      toast({
        title: "Access granted",
        description: `${clean} is past the paywall.`,
      });
      setEmail("");
      setExpiry("");
      reload();
    } catch (err) {
      toast({
        title: "Could not grant access",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (target: string) => {
    setRevoking(true);
    try {
      await api.accessRevoke(target);
      toast({ title: "Access revoked", description: `${target} is back behind the paywall.` });
      reload();
    } catch (err) {
      toast({
        title: "Could not revoke",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
      setConfirmRevoke(null);
    }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          Every email with an entitlement, whether it paid or not. Granting writes the same
          subscription row a payment would.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <Panel title="Grant access" description="Takes effect the next time that email opens the app.">
        <form onSubmit={grant} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="grant-email">Email</Label>
              <Input
                id="grant-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="someone@example.com"
              />
            </div>

            {appAccess && !lifetime && (
              <div className="space-y-1.5">
                <Label htmlFor="grant-expiry">Access ends</Label>
                <Input
                  id="grant-expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]">
              <Checkbox
                checked={appAccess}
                onCheckedChange={(v) => setAppAccess(v === true)}
                aria-label="Grant app access"
              />
              App access
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]">
              <Checkbox
                checked={scanner}
                onCheckedChange={(v) => setScanner(v === true)}
                aria-label="Grant the chart scanner"
              />
              AI chart scanner
            </label>
            {appAccess && (
              <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]">
                <Checkbox
                  checked={lifetime}
                  onCheckedChange={(v) => setLifetime(v === true)}
                  aria-label="Lifetime access"
                />
                Lifetime (no expiry)
              </label>
            )}
          </div>

          <Button type="submit" disabled={granting} className="gap-1.5">
            {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            Grant access
          </Button>
        </form>
      </Panel>

      <Panel title="Who has access" description={`${rows.length} entitled email${rows.length === 1 ? "" : "s"}.`}>
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : !rows.length ? (
          <Empty title="Nobody has access yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Has</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.email}>
                    <TableCell className="max-w-[240px] truncate font-medium">{r.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.lifetime && (
                          <Badge variant="secondary" className="font-normal">
                            Lifetime
                          </Badge>
                        )}
                        {r.appAccess && !r.lifetime && (
                          <Badge variant="secondary" className="font-normal">
                            App
                          </Badge>
                        )}
                        {r.scanner && (
                          <Badge variant="secondary" className="font-normal">
                            Scanner
                          </Badge>
                        )}
                        {!r.appAccess && !r.scanner && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.lifetime && !r.expiry ? "Never" : date(r.expiry)}
                    </TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">
                      {r.deviceBound ? "Bound" : "Not bound"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {date(r.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Revoke access for ${r.email}`}
                        onClick={() => setConfirmRevoke(r.email)}
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

      <AlertDialog open={Boolean(confirmRevoke)} onOpenChange={(o) => !o && setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access for {confirmRevoke}?</AlertDialogTitle>
            <AlertDialogDescription>
              They go back behind the paywall the next time the app checks. If they paid for this,
              revoking it takes away something they bought.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Leave it</AlertDialogCancel>
            <AlertDialogAction
              disabled={revoking}
              onClick={(e) => {
                e.preventDefault();
                if (confirmRevoke) void revoke(confirmRevoke);
              }}
            >
              {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
