import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { novaHost } from "@/integrations/novahost/client";
import { Check, Copy, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DBLicense {
  id: string;
  license_key: string;
  owner_email: string | null;
  status: string;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  expert_advisors: { name: string } | null;
  device_activations: Array<{ device_id: string }>;
}

/**
 * One shape for both layouts. The mobile cards and the desktop table used to
 * derive these fields separately, so a fallback fixed in one never reached the
 * other.
 */
interface Row {
  id: string;
  key: string;
  owner: string;
  robot: string;
  robotColor: string;
  deviceId: string | null;
  linked: boolean;
  status: string;
  expiresAt: string | null;
}

function toRow(lic: DBLicense): Row {
  const meta = (lic.metadata ?? {}) as Record<string, string | undefined>;
  const activations = lic.device_activations ?? [];
  return {
    id: lic.id,
    key: lic.license_key,
    owner: lic.owner_email || meta.username || "—",
    robot: lic.expert_advisors?.name || meta.name || meta.robot_name || "—",
    robotColor: meta.primary_color || "hsl(var(--muted-foreground))",
    deviceId: activations[0]?.device_id ?? null,
    linked: activations.length > 0,
    status: lic.status,
    expiresAt: lic.expires_at,
  };
}

const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const formatDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "Never");

/** Device ids are long enough to push every other column off screen. */
const truncate = (id: string) => (id.length > 14 ? id.slice(0, 8) + "…" + id.slice(-4) : id);

export default function LicenseManagement() {
  const [licenses, setLicenses] = useState<DBLicense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchLicenses = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const { data: sessionData } = await novaHost.auth.getSession();
      if (!sessionData.session) {
        setLicenses([]);
        return;
      }

      const { data, error } = await novaHost
        .from("licenses")
        .select(
          `id, license_key, owner_email, status, expires_at, metadata, created_at,
           expert_advisors:expert_advisors!licenses_ea_id_fkey ( name ),
           device_activations ( device_id )`,
        )
        .eq("user_id", sessionData.session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLicenses((data as unknown as DBLicense[]) ?? []);
    } catch (e) {
      // A failed load and an empty account are different things. This page used
      // to swallow the error and render both as "No matching licenses found".
      console.error("License fetch failed:", e);
      setLicenses([]);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const copyKey = async (row: Row) => {
    try {
      await navigator.clipboard.writeText(row.key);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((id) => (id === row.id ? null : id)), 1500);
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  const rows = useMemo(() => licenses.map(toRow), [licenses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.key.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.robot.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading licences…"
            : `${filtered.length} of ${rows.length} licence${rows.length === 1 ? "" : "s"}`}
        </p>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search key, owner or robot"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full pl-8 text-sm sm:w-72"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLicenses}
            disabled={isLoading}
            className="h-9 shrink-0 gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            failed={loadFailed}
            searching={query.trim().length > 0}
            onClear={() => setQuery("")}
            onRetry={fetchLicenses}
            onGenerate={() => navigate("/generate")}
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="section-label h-9 pl-5">License key</TableHead>
                    <TableHead className="section-label h-9">Owner</TableHead>
                    <TableHead className="section-label h-9">Robot</TableHead>
                    <TableHead className="section-label h-9">Device</TableHead>
                    <TableHead className="section-label h-9">Expires</TableHead>
                    <TableHead className="section-label h-9 pr-5 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => navigate(`/license-details/${row.key}`)}
                      className="cursor-pointer"
                    >
                      <TableCell className="py-2.5 pl-5">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-xs">{row.key}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            aria-label="Copy license key"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyKey(row);
                            }}
                          >
                            {copiedId === row.id ? (
                              <Check className="h-3 w-3 text-long" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.owner}</TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: row.robotColor }}
                            aria-hidden="true"
                          />
                          {row.robot}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.deviceId ? truncate(row.deviceId) : "Not linked"}
                      </TableCell>
                      <TableCell className="tabular text-sm text-muted-foreground">
                        {formatDate(row.expiresAt)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <StatusPill status={row.status} linked={row.linked} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/license-details/${row.key}`)}
                    className="w-full space-y-2 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: row.robotColor }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{row.robot}</span>
                      </span>
                      <StatusPill status={row.status} linked={row.linked} />
                    </div>
                    <code className="block font-mono text-xs text-muted-foreground">{row.key}</code>
                    <p className="truncate text-xs text-muted-foreground">{row.owner}</p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function StatusPill({ status, linked }: { status: string; linked: boolean }) {
  const expired = status?.toLowerCase() === "expired";
  const label = expired ? "Expired" : linked ? "Active" : "Not linked";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        expired && "border-short/30 bg-short/10 text-short",
        !expired && linked && "border-long/30 bg-long/10 text-long",
        !expired && !linked && "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          expired ? "bg-short" : linked ? "bg-long" : "bg-muted-foreground",
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function EmptyState({
  failed,
  searching,
  onClear,
  onRetry,
  onGenerate,
}: {
  failed: boolean;
  searching: boolean;
  onClear: () => void;
  onRetry: () => void;
  onGenerate: () => void;
}) {
  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load your licences.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (searching) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">No licence matches that search.</p>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">You haven't issued any licences yet.</p>
      <Button size="sm" onClick={onGenerate}>
        Generate a key
      </Button>
    </div>
  );
}
