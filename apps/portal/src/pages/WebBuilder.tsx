import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { novaHost } from "@/integrations/novahost/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScoreRing } from "@/components/ScoreRing";
import {
  callAffiliate,
  count,
  fetchAffiliateSummary,
  WEBSITE_COPY,
  type AffiliateSummary,
  type LinkItem,
} from "@/lib/affiliate";
import { cn } from "@/lib/utils";

/**
 * The free landing page a mentor earns at the qualifying-key threshold.
 *
 * This page is the intake, not the builder. It collects everything the site
 * needs to exist -- which robot, what it is called, the broker links the mentor
 * actually earns from, their group, their students' results, and how they want
 * their share settled -- and hands it to the operator to build and publish.
 *
 * The licence sale itself is still taken by NovaHost's own PayFast account and
 * the key is still issued by the platform, because the customer of record is
 * NovaHost (clause 9 of the agreement) and the key space is not the mentor's to
 * hand out. What the mentor gets is the page, the traffic and the commission.
 *
 * The page it replaced was a blurred mock-up under a "Coming Soon" banner, with
 * a Stripe logo and a dollar price on a product that has never taken either.
 */

const RESULT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface Robot {
  id: string;
  name: string;
  display_name: string | null;
}

interface FormState {
  eaId: string;
  subdomain: string;
  headline: string;
  tagline: string;
  about: string;
  priceZar: string;
  payoutMethod: string;
  payoutDetail: string;
  brokerLinks: LinkItem[];
  groupLinks: LinkItem[];
  results: LinkItem[];
}

const EMPTY: FormState = {
  eaId: "",
  subdomain: "",
  headline: "",
  tagline: "",
  about: "",
  priceZar: "",
  payoutMethod: "",
  payoutDetail: "",
  brokerLinks: [],
  groupLinks: [],
  results: [],
};

const PERKS = [
  {
    icon: Globe,
    title: "A page of your own",
    body: "Your robot, your name, your story — on its own web address, built for you.",
  },
  {
    icon: Building2,
    title: "Your broker links",
    body: "Every visitor who opens an account goes through your IB link, not somebody else's.",
  },
  {
    icon: CheckCircle2,
    title: "Keys sent automatically",
    body: "A buyer pays and gets their licence key and setup instructions straight away.",
  },
  {
    icon: Users,
    title: "Results and your group",
    body: "Show what your students are doing, and send the ones who are not ready yet to your community.",
  },
];

/** A repeatable list of small objects: broker links, group links, results. */
function Repeater({
  items,
  onChange,
  fields,
  addLabel,
  emptyHint,
  disabled,
  max = 10,
  children,
}: {
  items: LinkItem[];
  onChange: (next: LinkItem[]) => void;
  fields: Array<{ key: keyof LinkItem; label: string; placeholder?: string; wide?: boolean }>;
  addLabel: string;
  emptyHint: string;
  disabled?: boolean;
  max?: number;
  children?: (item: LinkItem, index: number) => React.ReactNode;
}) {
  const update = (i: number, key: keyof LinkItem, value: string) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)));

  return (
    <div className="space-y-2.5">
      {items.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-muted-foreground">
          {emptyHint}
        </p>
      )}

      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border p-3">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={String(f.key)} className={cn("space-y-1", f.wide && "sm:col-span-2")}>
                <Label className="text-[11.5px] text-muted-foreground">{f.label}</Label>
                <Input
                  value={(item[f.key] as string) ?? ""}
                  placeholder={f.placeholder}
                  disabled={disabled}
                  onChange={(e) => update(i, f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
          {children?.(item, i)}
          {!disabled && (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-muted-foreground"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          )}
        </div>
      ))}

      {!disabled && items.length < max && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onChange([...items, {}])}
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}

export default function WebBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const resultInput = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      /*
       * Scoped to this mentor. The picker below chooses which robot the
       * affiliate site is built around, and this query carried no `user_id`
       * filter -- it leaned on RLS, which held a blanket
       * "Authenticated users can read products" USING (true) until
       * 20260916090000. Every mentor's robots appeared in the dropdown, so a
       * mentor could point their site at a bot they do not own.
       */
      const [res, eas] = await Promise.all([
        fetchAffiliateSummary(),
        novaHost
          .from("expert_advisors")
          .select("id, name, display_name")
          .eq("user_id", user?.id ?? ""),
      ]);
      setSummary(res);
      setRobots((eas.data ?? []) as Robot[]);

      const w = res.website;
      setForm({
        eaId: w?.eaId ?? "",
        subdomain: w?.subdomain ?? "",
        headline: w?.headline ?? "",
        tagline: w?.tagline ?? "",
        about: w?.about ?? "",
        priceZar: w?.priceZar != null ? String(w.priceZar) : "",
        payoutMethod: w?.payoutMethod ?? "",
        payoutDetail: w?.payoutDetail ?? "",
        brokerLinks: w?.brokerLinks ?? [],
        groupLinks: w?.groupLinks ?? [],
        results: w?.results ?? [],
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We could not load your website request.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const threshold = summary?.programme.websiteThreshold ?? 30;
  const earned = summary?.scoreboard.qualifyingKeys ?? 0;
  const unlocked = earned >= threshold;
  const website = summary?.website ?? null;
  const status = website?.status ?? "draft";
  const locked = ["in_review", "approved", "building", "live"].includes(status);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onPickResult(file: File | null) {
    if (!file || !user) return;
    if (!RESULT_TYPES.includes(file.type)) {
      toast({
        title: "That is not an image",
        description: "Upload a PNG, JPEG or WebP screenshot.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "That image is too large",
        description: "Keep screenshots under 10 MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const ext = file.type.split("/")[1] ?? "png";
      const path = `${user.id}/website/${Date.now()}-result.${ext}`;
      const { error } = await novaHost.storage
        .from("mentor-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;

      set("results", [...form.results, { path, caption: "" }]);
      toast({ title: "Screenshot added", description: "Give it a caption so we know what it shows." });
    } catch (e) {
      toast({
        title: "The upload did not go through",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (resultInput.current) resultInput.current.value = "";
    }
  }

  async function save(submit: boolean) {
    setSaving(submit ? "submit" : "draft");
    try {
      await callAffiliate({
        action: "website.save",
        submit,
        website: {
          eaId: form.eaId || null,
          subdomain: form.subdomain || null,
          headline: form.headline,
          tagline: form.tagline,
          about: form.about,
          priceZar: form.priceZar ? Number(form.priceZar) : null,
          payoutMethod: form.payoutMethod || null,
          payoutDetail: form.payoutDetail,
          brokerLinks: form.brokerLinks,
          groupLinks: form.groupLinks,
          results: form.results,
        },
      });
      toast({
        title: submit ? "Request sent" : "Saved",
        description: submit
          ? "We will build your page and come back to you."
          : "Your draft is saved. Nothing has been sent yet.",
      });
      await load();
    } catch (e) {
      toast({
        title: submit ? "We could not send that" : "We could not save that",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[900px]">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={() => void load()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ---- Not earned yet ------------------------------------------------------
  if (!unlocked) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4">
        <Card>
          <CardContent className="grid gap-8 p-6 sm:p-8 md:grid-cols-[auto,1fr] md:items-center">
            <ScoreRing
              value={earned}
              target={threshold}
              label="qualifying keys"
              size={180}
            />
            <div>
              <Badge variant="secondary" className="font-normal">
                <Lock className="mr-1.5 h-3 w-3" />
                Locked
              </Badge>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                A free landing page for your robot
              </h1>
              <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-muted-foreground">
                Sell {count(threshold)} licence keys and we build you a page, at no cost, to sell the
                next hundred. You have {count(earned)}.{" "}
                {count(Math.max(0, threshold - earned))} to go.
              </p>
              <Button asChild className="mt-4 gap-1.5">
                <Link to="/affiliate">
                  See your commission
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {PERKS.map((perk) => (
            <Card key={perk.title}>
              <CardContent className="flex gap-3 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                  <perk.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{perk.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {perk.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="px-1 pb-2 text-[12px] text-muted-foreground">
          A key counts once the student has paid for app access
          {summary?.programme.requireScanner ? " and the AI chart scanner" : ""} and the payment has
          cleared. Keys you have generated but nobody has paid for do not count.
        </p>
      </div>
    );
  }

  // ---- Earned: the intake --------------------------------------------------
  const statusCopy = WEBSITE_COPY[status];

  return (
    <div className="mx-auto max-w-[1000px] space-y-4">
      <Alert className={cn(status === "live" && "border-success/40")}>
        <Globe className="h-4 w-4" />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong className="font-medium">
              {status === "draft"
                ? "Your free page is unlocked."
                : `${statusCopy.label}.`}
            </strong>{" "}
            {status === "draft"
              ? `You have sold ${count(earned)} qualifying keys. Fill this in and we will build it.`
              : status === "live"
                ? "Your page is live."
                : status === "rejected"
                  ? website?.reviewNote || "We need a few changes before we can build it."
                  : "We have everything we need and are working on it."}
          </span>
          {website?.liveUrl && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={website.liveUrl} target="_blank" rel="noopener noreferrer">
                Open it
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </AlertDescription>
      </Alert>

      {/* ---- The robot and the address ------------------------------------- */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle>What the page sells</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Robot</Label>
            <Select value={form.eaId} onValueChange={(v) => set("eaId", v)} disabled={locked}>
              <SelectTrigger>
                <SelectValue placeholder="Choose one of your robots" />
              </SelectTrigger>
              <SelectContent>
                {robots.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.display_name || r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {robots.length === 0 && (
              <p className="text-[11.5px] text-muted-foreground">
                You have no robots yet. Add one under Expert Advisors first.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subdomain" className="text-[12.5px]">
              Web address
            </Label>
            <div className="flex items-center">
              <Input
                id="subdomain"
                value={form.subdomain}
                disabled={locked}
                onChange={(e) =>
                  set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="your-robot"
                className="rounded-r-none"
              />
              <span className="flex h-10 items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-[12.5px] text-muted-foreground">
                .novahost-ea.app
              </span>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Lowercase letters, numbers and hyphens.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="headline" className="text-[12.5px]">
              Headline
            </Label>
            <Input
              id="headline"
              value={form.headline}
              disabled={locked}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="The gold scalper my students actually run"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tagline" className="text-[12.5px]">
              One line under it
            </Label>
            <Input
              id="tagline"
              value={form.tagline}
              disabled={locked}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Hosted for you. Runs on your own broker account."
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="about" className="text-[12.5px]">
              About the robot
            </Label>
            <Textarea
              id="about"
              value={form.about}
              disabled={locked}
              rows={5}
              onChange={(e) => set("about", e.target.value)}
              placeholder="What it trades, when it trades, who it is for. Say what is true — no guaranteed returns, no 'you cannot lose'. Clause 8 of your agreement applies to this page too."
            />
          </div>
        </CardContent>
      </Card>

      {/* ---- Broker links --------------------------------------------------- */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Your broker links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          <p className="max-w-[70ch] text-[12.5px] text-muted-foreground">
            Your IB or partner links. A visitor who opens an account from your page opens it through
            these — this is usually worth more than the licence sale.
          </p>
          <Repeater
            items={form.brokerLinks}
            onChange={(next) => set("brokerLinks", next)}
            disabled={locked}
            addLabel="Add a broker"
            emptyHint="No broker links yet. Add at least one."
            fields={[
              { key: "label", label: "Broker", placeholder: "Exness" },
              { key: "url", label: "Your link", placeholder: "https://…" },
              {
                key: "note",
                label: "Anything the visitor should know",
                placeholder: "Use the Standard account, minimum $50",
                wide: true,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* ---- Community ------------------------------------------------------ */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Your community
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <Repeater
            items={form.groupLinks}
            onChange={(next) => set("groupLinks", next)}
            disabled={locked}
            addLabel="Add a group"
            emptyHint="No group links yet."
            fields={[
              { key: "platform", label: "Where", placeholder: "Telegram, WhatsApp, Discord" },
              { key: "label", label: "What it is called", placeholder: "Free signals channel" },
              { key: "url", label: "Link", placeholder: "https://t.me/…", wide: true },
            ]}
          />
        </CardContent>
      </Card>

      {/* ---- Results -------------------------------------------------------- */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            Student results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          <p className="max-w-[70ch] text-[12.5px] text-muted-foreground">
            Screenshots of what your students have actually done. Every one goes on the page with the
            standard risk disclosure beside it — past results are not a promise of future ones, and
            the page will say so.
          </p>

          <input
            ref={resultInput}
            type="file"
            accept={RESULT_TYPES.join(",")}
            className="hidden"
            onChange={(e) => void onPickResult(e.target.files?.[0] ?? null)}
          />

          <Repeater
            items={form.results}
            onChange={(next) => set("results", next)}
            disabled={locked}
            max={20}
            addLabel="Add a caption only"
            emptyHint="No results uploaded yet."
            fields={[
              { key: "caption", label: "Caption", placeholder: "+18% in 6 weeks, $500 account", wide: true },
              { key: "posted_on", label: "When", placeholder: "August 2026" },
            ]}
          >
            {(item) =>
              item.path ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  Screenshot attached
                </p>
              ) : null
            }
          </Repeater>

          {!locked && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => resultInput.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload a screenshot
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ---- Money ---------------------------------------------------------- */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            How you get paid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-[12.5px]">
              Checkout on your page runs through NovaHost's payment account, because the licence key
              has to be issued by the platform that owns it and the buyer is a NovaHost customer.
              Your share is settled to you on your normal commission schedule — tell us below where
              to send it.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Settle my share by</Label>
              <Select
                value={form.payoutMethod}
                onValueChange={(v) => set("payoutMethod", v)}
                disabled={locked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">
                    The bank account on my agreement
                  </SelectItem>
                  <SelectItem value="other_bank">A different bank account</SelectItem>
                  <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payoutDetail" className="text-[12.5px]">
                Details
              </Label>
              <Input
                id="payoutDetail"
                value={form.payoutDetail}
                disabled={locked || form.payoutMethod === "bank"}
                onChange={(e) => set("payoutDetail", e.target.value)}
                placeholder={
                  form.payoutMethod === "bank"
                    ? "We already have these"
                    : form.payoutMethod === "crypto"
                      ? "Wallet address and network"
                      : "Bank, account holder, number, branch code"
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priceZar" className="text-[12.5px]">
                Price you want shown (ZAR)
              </Label>
              <Input
                id="priceZar"
                value={form.priceZar}
                disabled={locked}
                inputMode="decimal"
                onChange={(e) => set("priceZar", e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="950"
              />
              <p className="text-[11.5px] text-muted-foreground">
                What NovaHost charges is set by NovaHost. This is a request, and we will tell you if
                it cannot be honoured.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!locked && (
        <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
          <Button
            variant="outline"
            onClick={() => void save(false)}
            disabled={saving !== null}
            className="gap-1.5"
          >
            {saving === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save for later
          </Button>
          <Button onClick={() => void save(true)} disabled={saving !== null} className="gap-1.5">
            {saving === "submit" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send the request
          </Button>
        </div>
      )}
    </div>
  );
}
