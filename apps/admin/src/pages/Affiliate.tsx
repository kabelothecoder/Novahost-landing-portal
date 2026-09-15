import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Bot,
  KeyRound,
  Percent,
  RefreshCw,
  Save,
  Settings2,
  Trophy,
  Users,
} from "lucide-react";
import { api, type AffiliateSettings } from "@/lib/api";
import { date, money, relative } from "@/lib/format";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { Empty, LoadError, Panel, Stat, TableSkeleton } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Who is selling, and what is selling.
 *
 * Two leaderboards off one definition of a sale: a licence key counts once the
 * student has paid for it and the money has cleared. Generating a key is not a
 * sale and this page never treats it as one — which is why the conversion
 * column matters more than the keys-issued column, and why a mentor with forty
 * keys and one payment reads correctly here as a mentor with one sale.
 *
 * The commission figures are not recomputed in this browser. They come from the
 * same views the mentor's own page reads, so nobody can be shown a different
 * number to the one their mentor is looking at.
 */

const AGREEMENT_TONE: Record<string, string> = {
  approved: "bg-success text-success-foreground hover:bg-success",
  submitted: "bg-warning text-warning-foreground hover:bg-warning",
  rejected: "bg-destructive text-destructive-foreground hover:bg-destructive",
  draft: "",
  none: "",
};

const AGREEMENT_LABEL: Record<string, string> = {
  approved: "Approved",
  submitted: "Waiting",
  rejected: "Rejected",
  draft: "Draft",
  none: "None",
};

/** The programme terms, editable in place. */
function ProgrammeTerms({
  settings,
  onSaved,
}: {
  settings: AffiliateSettings;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    optionBTarget: String(settings.optionBTarget),
    optionBRate: String(Math.round(settings.optionBRate * 100)),
    optionATarget: String(settings.optionATarget),
    optionARate: String(Math.round(settings.optionARate * 100)),
    websiteThreshold: String(settings.websiteThreshold),
    requireScanner: settings.requireScanner,
    agreementVersion: settings.agreementVersion,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.affiliateSettingsUpdate({
        optionBTarget: Number(form.optionBTarget),
        optionBRate: Number(form.optionBRate),
        optionATarget: Number(form.optionATarget),
        optionARate: Number(form.optionARate),
        websiteThreshold: Number(form.websiteThreshold),
        requireScanner: form.requireScanner,
        agreementVersion: form.agreementVersion,
      });
      toast({
        title: "Programme terms saved",
        description:
          "New terms apply to agreements approved from now on. Agreements already approved keep the rate they were approved at.",
      });
      onSaved();
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    suffix?: string,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={String(form[key])}
          inputMode="numeric"
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value.replace(/[^0-9]/g, "") }))}
        />
        {suffix && <span className="text-[12.5px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {field("optionBTarget", "Option B target", "keys / month")}
        {field("optionBRate", "Option B rate", "%")}
        {field("optionATarget", "Option A target", "keys")}
        {field("optionARate", "Option A rate", "%")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {field("websiteThreshold", "Free website at", "qualifying keys")}
        <div className="space-y-1.5">
          <Label className="text-[12.5px]">Agreement version</Label>
          <Input
            value={form.agreementVersion}
            onChange={(e) => setForm((f) => ({ ...f, agreementVersion: e.target.value }))}
          />
        </div>
        <div className="flex items-start gap-3 sm:col-span-2">
          <Switch
            id="require-scanner"
            checked={form.requireScanner}
            onCheckedChange={(v) => setForm((f) => ({ ...f, requireScanner: v }))}
          />
          <div>
            <Label htmlFor="require-scanner" className="text-[12.5px]">
              A key must also have the chart scanner paid for
            </Label>
            <p className="mt-0.5 max-w-[52ch] text-[11.5px] text-muted-foreground">
              On, a key qualifies only when app access <em>and</em> the scanner are paid. Off, app
              access alone is enough. This changes every mentor&rsquo;s count immediately.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save terms"}
        </Button>
      </div>
    </div>
  );
}

export default function Affiliate() {
  const { data, error, loading, reload } = useAsync(() => api.affiliateOverview(), []);

  const mentors = data?.mentors ?? [];
  const robots = data?.robots ?? [];
  const totals = data?.totals;

  const topMentor = useMemo(() => mentors[0] ?? null, [mentors]);
  const topRobot = useMemo(() => robots[0] ?? null, [robots]);

  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[72ch] text-[13px] text-muted-foreground">
          A licence key counts as a sale once the student has paid for it and PayFast has cleared
          the payment. Keys a mentor generated but nobody bought are shown, and counted separately.
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          loading={loading}
          label="Qualifying sales"
          value={totals?.qualifyingKeys ?? 0}
          icon={KeyRound}
          hint={`${money(totals?.qualifyingRevenue ?? 0)} of licence revenue`}
        />
        <Stat
          loading={loading}
          label="Commission owed"
          value={money(totals?.commissionDue ?? 0)}
          icon={Percent}
          tone={(totals?.commissionDue ?? 0) > 0 ? "warn" : "default"}
          hint="approved agreements that have met their target"
        />
        <Stat
          loading={loading}
          label="Paid out"
          value={money(totals?.paidOut ?? 0)}
          icon={Banknote}
        />
        <Stat
          loading={loading}
          label="Waiting on you"
          value={(totals?.agreementsPending ?? 0) + (totals?.websitesPending ?? 0)}
          icon={Users}
          tone={(totals?.agreementsPending ?? 0) + (totals?.websitesPending ?? 0) > 0 ? "warn" : "good"}
          hint={`${totals?.agreementsPending ?? 0} agreements, ${totals?.websitesPending ?? 0} websites`}
        />
      </div>

      {/* Money that arrived with no licence key on it. Shown rather than
          quietly dropped: a commission total that is light for a knowable
          reason should say so. */}
      {!loading && (totals?.unattributedPayments ?? 0) > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-[12.5px] text-muted-foreground">
            <strong className="font-medium text-foreground">
              {totals!.unattributedPayments} payments totalling {money(totals!.unattributedRevenue)}
            </strong>{" "}
            carry no licence key, so no mentor can be credited for them. These are almost all from
            before the checkout started requiring the key. They are excluded from every figure on
            this page rather than guessed at.
          </p>
        </div>
      )}

      {!loading && (topMentor || topRobot) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {topMentor && (
            <Panel title="Top mentor" description="By qualifying sales, all time">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{topMentor.name}</p>
                  <p className="text-[12.5px] text-muted-foreground">
                    {topMentor.qualifyingKeys} sold · {money(topMentor.qualifyingRevenue)} ·{" "}
                    {topMentor.conversionPct.toFixed(1)}% of keys issued
                  </p>
                </div>
              </div>
            </Panel>
          )}
          {topRobot && (
            <Panel title="Top robot" description="By qualifying sales, all time">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{topRobot.name}</p>
                  <p className="text-[12.5px] text-muted-foreground">
                    {topRobot.qualifyingKeys} sold of {topRobot.keysIssued} issued ·{" "}
                    {topRobot.conversionPct.toFixed(1)}% · {topRobot.mentorName}
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}

      <Tabs defaultValue="mentors">
        <TabsList>
          <TabsTrigger value="mentors">Mentors</TabsTrigger>
          <TabsTrigger value="robots">Robots</TabsTrigger>
          <TabsTrigger value="terms" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Programme terms
          </TabsTrigger>
        </TabsList>

        {/* ---- Mentors ------------------------------------------------------ */}
        <TabsContent value="mentors" className="mt-4">
          <Panel title="Mentor leaderboard" description="Ordered by qualifying sales">
            {loading ? (
              <TableSkeleton rows={5} cols={7} />
            ) : mentors.length === 0 ? (
              <Empty
                title="No mentors have issued a key yet"
                body="Rows appear here as soon as a mentor generates their first licence key."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right">Sold</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">This month</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Owed</TableHead>
                      <TableHead className="text-right">Agreement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentors.map((m) => (
                      <TableRow key={m.mentorId}>
                        <TableCell>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {m.email ?? "—"}
                            {m.lastSaleAt ? ` · last sale ${relative(m.lastSaleAt)}` : ""}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.keysIssued}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {m.qualifyingKeys}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            m.conversionPct < 10 && m.keysIssued >= 10 && "text-muted-foreground",
                          )}
                        >
                          {m.conversionPct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={m.targetMet ? "text-success" : undefined}>
                            {m.commissionOption === "A"
                              ? m.qualifyingKeys
                              : m.qualifyingKeysThisMonth}
                          </span>
                          <span className="text-muted-foreground">/{m.target}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(m.qualifyingRevenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.commissionDue > 0 ? (
                            <span className="font-medium text-warning">
                              {money(m.commissionDue)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={m.agreementStatus === "none" ? "outline" : "secondary"}
                            className={cn("font-normal", AGREEMENT_TONE[m.agreementStatus])}
                          >
                            {AGREEMENT_LABEL[m.agreementStatus]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  &ldquo;Owed&rdquo; is only ever a number for a mentor with an approved agreement
                  who has met their target. Everyone else shows a dash, because nothing is owed to
                  them yet.
                </p>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* ---- Robots ------------------------------------------------------- */}
        <TabsContent value="robots" className="mt-4">
          <Panel
            title="Robot leaderboard"
            description="Which product actually sells, as opposed to which mentor pushes hardest"
          >
            {loading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : robots.length === 0 ? (
              <Empty
                title="No robot has a key against it yet"
                body="A robot appears here once a mentor issues its first licence key."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Robot</TableHead>
                      <TableHead>Mentor</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right">Sold</TableHead>
                      <TableHead className="text-right">Conversion</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Last sale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {robots.map((r) => (
                      <TableRow key={r.eaId}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.mentorName ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.keysIssued}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {r.qualifyingKeys}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.conversionPct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(r.qualifyingRevenue)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {r.lastSaleAt ? date(r.lastSaleAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* ---- Terms -------------------------------------------------------- */}
        <TabsContent value="terms" className="mt-4">
          <Panel
            title="Programme terms"
            description="These are commercial terms, not code. Changing them here takes effect immediately and needs no deploy."
          >
            {loading || !data ? (
              <TableSkeleton rows={3} cols={4} />
            ) : (
              <ProgrammeTerms settings={data.settings} onSaved={reload} />
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
