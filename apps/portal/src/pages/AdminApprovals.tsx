import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Lock, Loader2, Check, X, MailCheck, MailWarning, ExternalLink } from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

interface MentorRow {
  id: string;
  email: string | null;
  fullName: string | null;
  displayName: string | null;
  phone: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  approvalNote: string | null;
  approvedAt: string | null;
  createdAt: string | null;
  emailVerified: boolean;
  instagram: string | null;
  tiktok: string | null;
  telegram: string | null;
  whatsapp: string | null;
}

/** A signup link, rendered only when the mentor supplied one. */
function VettingLink({ label, href }: { label: string; href: string | null }) {
  if (!href) return null;
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export default function AdminApprovals() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();

  const [rows, setRows] = useState<MentorRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const { data, error } = await novaHost.functions.invoke("admin-approve-mentor", {
        body: { action: "list" },
      });
      if (error) throw error;
      if (data?.success) setRows(data.rows ?? []);
      else throw new Error(data?.error || "Failed to load signups");
    } catch (err: any) {
      toast({
        title: "Couldn't load signups",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setListLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!adminLoading && isAdmin) loadList();
  }, [adminLoading, isAdmin, loadList]);

  const decide = async (row: MentorRow, action: "approve" | "reject") => {
    setDeciding(row.id);
    try {
      const { data, error } = await novaHost.functions.invoke("admin-approve-mentor", {
        body: { action, userId: row.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || `${action} failed`);

      toast({
        title: action === "approve" ? "Mentor approved" : "Mentor rejected",
        description:
          action === "approve"
            ? `${row.email ?? row.displayName ?? "They"} can now use the portal.`
            : `${row.email ?? row.displayName ?? "They"} stays locked out.`,
      });
      loadList();
    } catch (err: any) {
      toast({
        title: `Could not ${action}`,
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setDeciding(null);
      setConfirmReject(null);
    }
  };

  const pending = useMemo(() => rows.filter((r) => r.approvalStatus === "pending"), [rows]);
  const decided = useMemo(() => rows.filter((r) => r.approvalStatus !== "pending"), [rows]);

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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mentor Approvals</h1>
          <p className="text-muted-foreground">Review new portal signups</p>
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
          <UserCheck className="h-6 w-6 text-primary" />
          Mentor Approvals
          {pending.length > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {pending.length} waiting
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          Every new signup is locked out of the portal until it is approved here. Check the
          social links before deciding — that is what they are collected for.
        </p>
      </div>

      {/* Waiting */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Waiting for review</CardTitle>
          <p className="text-sm text-muted-foreground">
            Approving lets them straight into the portal. Rejecting keeps them locked out —
            it does not delete the account, so you can approve it later.
          </p>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : pending.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nothing waiting. New signups land here automatically.
            </p>
          ) : (
            <ul className="space-y-3">
              {pending.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-border/50 p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {r.displayName || r.fullName || "Unnamed"}
                      </span>
                      {r.emailVerified ? (
                        <Badge className="bg-success/10 text-success border-success/20 gap-1">
                          <MailCheck className="h-3 w-3" /> Email verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <MailWarning className="h-3 w-3" /> Email unverified
                        </Badge>
                      )}
                    </div>

                    <p className="font-mono text-xs text-muted-foreground break-all">
                      {r.email ?? "—"}
                      {r.phone ? ` · ${r.phone}` : ""}
                    </p>

                    {r.fullName && r.displayName && r.fullName !== r.displayName && (
                      <p className="text-xs text-muted-foreground">Full name: {r.fullName}</p>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                      <VettingLink label="Instagram" href={r.instagram} />
                      <VettingLink label="TikTok" href={r.tiktok} />
                      <VettingLink label="Telegram" href={r.telegram} />
                      <VettingLink label="WhatsApp" href={r.whatsapp} />
                    </div>

                    {r.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        Signed up {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {confirmReject === r.id ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deciding === r.id}
                        onClick={() => decide(r, "reject")}
                      >
                        {deciding === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Confirm reject"
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={deciding === r.id}
                        onClick={() => setConfirmReject(r.id)}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    )}

                    <Button size="sm" disabled={deciding === r.id} onClick={() => decide(r, "approve")}>
                      {deciding === r.id && confirmReject !== r.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Everyone else */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Already decided</CardTitle>
          <p className="text-sm text-muted-foreground">
            Accounts that predate this queue show as approved with no reviewer — they were
            grandfathered in, not actually reviewed.
          </p>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : decided.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No decisions yet.</p>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[140px]">Name</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Decided</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decided.map((r) => (
                      <TableRow key={r.id} className="border-border/30">
                        <TableCell className="font-mono text-xs break-all">{r.email ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {r.displayName || r.fullName || "—"}
                        </TableCell>
                        <TableCell>
                          {r.approvalStatus === "approved" ? (
                            <Badge className="bg-success/10 text-success border-success/20">
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Rejected</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.approvalStatus === "rejected" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deciding === r.id}
                              onClick={() => decide(r, "approve")}
                            >
                              {deciding === r.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={deciding === r.id}
                              onClick={() => decide(r, "reject")}
                            >
                              {deciding === r.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Revoke"
                              )}
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
