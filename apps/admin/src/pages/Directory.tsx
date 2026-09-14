import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { date, money, relative } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Everyone, split by what they actually are.
 *
 * These are two different populations and conflating them is the fastest way to
 * misread the business. A mentor is an auth account with a profile; an app user
 * is an email with an entitlement and usually no account at all. One person can
 * be both, and the two lists will not add up — that is correct.
 */
export default function Directory() {
  const { data, error, loading, reload } = useAsync(() => api.directory(), []);
  const [query, setQuery] = useState("");

  const mentors = data?.mentors ?? [];
  const appUsers = data?.appUsers ?? [];

  const q = query.trim().toLowerCase();

  const filteredMentors = useMemo(
    () =>
      !q
        ? mentors
        : mentors.filter(
            (m) =>
              (m.email ?? "").toLowerCase().includes(q) ||
              (m.displayName ?? "").toLowerCase().includes(q) ||
              (m.fullName ?? "").toLowerCase().includes(q),
          ),
    [mentors, q],
  );

  const filteredUsers = useMemo(
    () => (!q ? appUsers : appUsers.filter((u) => u.email.includes(q))),
    [appUsers, q],
  );

  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-muted-foreground">
          Mentors hold accounts and issue keys. App users are emails with entitlements &mdash; most
          of them never create an account at all.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat loading={loading} label="Mentors" value={mentors.length} />
        <Stat
          loading={loading}
          label="Approved mentors"
          value={mentors.filter((m) => m.approvalStatus === "approved").length}
        />
        <Stat loading={loading} label="App users" value={appUsers.length} />
        <Stat
          loading={loading}
          label="Lifetime spend"
          value={money(
            appUsers.reduce((s, u) => s + u.spend, 0),
            true,
          )}
        />
      </div>

      <Panel
        title="Directory"
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email or name"
              className="h-9 w-[230px] pl-8 text-[13px]"
            />
          </div>
        }
      >
        <Tabs defaultValue="mentors">
          <TabsList className="mb-4">
            <TabsTrigger value="mentors" className="text-[13px]">
              Mentors ({filteredMentors.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="text-[13px]">
              App users ({filteredUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mentors">
            {loading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : !filteredMentors.length ? (
              <Empty title={q ? "No mentor matches that" : "No mentor accounts yet"} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Licences</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead className="text-right">Last sign-in</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMentors.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.displayName || m.fullName || "—"}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">
                          {m.email ?? "—"}
                          {!m.emailVerified && m.email && (
                            <Badge variant="outline" className="ml-2 font-normal text-warning">
                              unverified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.approvalStatus === "approved"
                                ? "secondary"
                                : m.approvalStatus === "rejected"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="font-normal capitalize"
                          >
                            {m.approvalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.licencesIssued}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {m.licenseCredits}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                          {m.lastSignInAt ? relative(m.lastSignInAt) : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {loading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : !filteredUsers.length ? (
              <Empty title={q ? "No app user matches that" : "No app users yet"} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Has</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.email}>
                        <TableCell className="max-w-[240px] truncate font-medium">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.isLifetime && (
                              <Badge variant="secondary" className="font-normal">
                                Lifetime
                              </Badge>
                            )}
                            {u.isPremium && !u.isLifetime && (
                              <Badge variant="secondary" className="font-normal">
                                Premium
                              </Badge>
                            )}
                            {u.hasScanner && (
                              <Badge variant="secondary" className="font-normal">
                                Scanner
                              </Badge>
                            )}
                            {!u.isLifetime && !u.isPremium && !u.hasScanner && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[12.5px] text-muted-foreground">
                          {u.bound ? "Bound" : "Not bound"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {u.spend ? money(u.spend) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                          {date(u.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Panel>
    </div>
  );
}
