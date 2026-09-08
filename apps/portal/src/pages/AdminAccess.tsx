import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Gift, Trash2, Loader2, Lock } from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

interface AccessRow {
  email: string;
  appAccess: boolean;
  lifetime: boolean;
  scanner: boolean;
  expiry: string | null;
  deviceBound: boolean;
  createdAt: string | null;
}

export default function AdminAccess() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();

  const [rows, setRows] = useState<AccessRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [appAccess, setAppAccess] = useState(true);
  const [scanner, setScanner] = useState(false);
  const [lifetime, setLifetime] = useState(true);
  const [expiry, setExpiry] = useState("");
  const [granting, setGranting] = useState(false);

  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const { data, error } = await novaHost.functions.invoke("admin-grant-access", {
        body: { action: "list" },
      });
      if (error) throw error;
      if (data?.success) setRows(data.rows ?? []);
      else throw new Error(data?.error || "Failed to load access list");
    } catch (err: any) {
      toast({ title: "Couldn't load access list", description: err.message || String(err), variant: "destructive" });
    } finally {
      setListLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!adminLoading && isAdmin) loadList();
  }, [adminLoading, isAdmin, loadList]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (!appAccess && !scanner) {
      toast({ title: "Pick at least one", description: "Grant app access, the scanner, or both.", variant: "destructive" });
      return;
    }
    if (appAccess && !lifetime && !expiry) {
      toast({ title: "Set an expiry date", description: "A time-limited grant needs an end date.", variant: "destructive" });
      return;
    }

    setGranting(true);
    try {
      const { data, error } = await novaHost.functions.invoke("admin-grant-access", {
        body: {
          action: "grant",
          email: clean,
          appAccess,
          scanner,
          lifetime,
          expiry: lifetime ? null : new Date(expiry).toISOString(),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Grant failed");

      toast({
        title: data.created ? "Access granted" : "Access updated",
        description: `${clean} — app ${data.appAccess ? "on" : "off"}${data.lifetime ? " (lifetime)" : data.expiry ? " (until " + new Date(data.expiry).toLocaleDateString() + ")" : ""}, scanner ${data.scanner ? "on" : "off"}.`,
      });
      setEmail("");
      setScanner(false);
      setLifetime(true);
      setExpiry("");
      loadList();
    } catch (err: any) {
      toast({ title: "Grant failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (target: string) => {
    setRevoking(target);
    try {
      const { data, error } = await novaHost.functions.invoke("admin-grant-access", {
        body: { action: "revoke", email: target },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Revoke failed");
      toast({ title: "Access removed", description: `${target} can no longer use the app.` });
      loadList();
    } catch (err: any) {
      toast({ title: "Revoke failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setRevoking(null);
      setConfirmRevoke(null);
    }
  };

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (adminLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Comp Access</h1>
          <p className="text-muted-foreground">Grant app access without payment</p>
        </div>
        <Alert className="border-destructive/20 bg-destructive/5">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This page is for administrators only. Your account does not have admin access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Comp Access
        </h1>
        <p className="text-muted-foreground">
          Give an email address access to the app without going through PayFast. Writes the same
          entitlement a paid purchase would.
        </p>
      </div>

      {/* Grant form */}
      <Card className="bg-gradient-card border-border">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Grant access</CardTitle>
            <p className="text-sm text-muted-foreground">
              The person still installs the app and signs in with this email. It binds to the first
              device they use, exactly like a paid licence.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGrant} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="grant-email">Email address</Label>
              <Input
                id="grant-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="person@example.com"
                disabled={granting}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="app-access" checked={appAccess} onCheckedChange={(v) => setAppAccess(v as boolean)} disabled={granting} />
                <Label htmlFor="app-access" className="cursor-pointer font-normal">App access</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="scanner" checked={scanner} onCheckedChange={(v) => setScanner(v as boolean)} disabled={granting} />
                <Label htmlFor="scanner" className="cursor-pointer font-normal">AI chart scanner</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lifetime"
                  checked={lifetime}
                  onCheckedChange={(v) => setLifetime(v as boolean)}
                  disabled={granting || !appAccess}
                />
                <Label htmlFor="lifetime" className="cursor-pointer font-normal">
                  Lifetime <span className="text-muted-foreground">(uncheck to set an end date)</span>
                </Label>
              </div>
            </div>

            {appAccess && !lifetime && (
              <div className="space-y-2">
                <Label htmlFor="expiry">Access ends on</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  disabled={granting}
                  className="w-auto"
                />
              </div>
            )}

            <Button type="submit" disabled={granting} className="w-full md:w-auto">
              {granting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Granting…</> : <>Grant access</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current access */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Everyone with access</CardTitle>
          <p className="text-sm text-muted-foreground">
            All subscription records — comped and paid. Revoking here removes app access for that
            email regardless of how it was granted.
          </p>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No subscription records yet.</p>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[100px]">App</TableHead>
                      <TableHead className="min-w-[100px]">Scanner</TableHead>
                      <TableHead className="min-w-[120px]">Expiry</TableHead>
                      <TableHead className="min-w-[90px]">Device</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.email} className="border-border/30">
                        <TableCell className="font-mono text-xs">{r.email}</TableCell>
                        <TableCell>
                          {r.appAccess ? (
                            <Badge className="bg-success/10 text-success border-success/20">
                              {r.lifetime ? "Lifetime" : "Timed"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">—</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.scanner ? (
                            <Badge className="bg-success/10 text-success border-success/20">On</Badge>
                          ) : (
                            <Badge variant="secondary">—</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.expiry ? new Date(r.expiry).toLocaleDateString() : r.lifetime ? "Never" : "—"}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs ${r.deviceBound ? "text-warning" : "text-muted-foreground"}`}>
                            {r.deviceBound ? "Bound" : "Free"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {confirmRevoke === r.email ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={revoking === r.email}
                              onClick={() => handleRevoke(r.email)}
                            >
                              {revoking === r.email ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm remove"}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmRevoke(r.email)}
                              disabled={!r.appAccess && !r.scanner}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
