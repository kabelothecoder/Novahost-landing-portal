import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Upload,
  X,
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
import { useToast } from "@/hooks/use-toast";
import { novaHost } from "@/integrations/novahost/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AGREEMENT_COPY,
  callAffiliate,
  count,
  fetchAffiliateSummary,
  shortDate,
  type AffiliateSummary,
} from "@/lib/affiliate";
import { cn } from "@/lib/utils";

/**
 * Download the agreement, sign it, send it back.
 *
 * The PDF is served from the app's own assets rather than storage, so it is
 * there whether or not the mentor is online and needs no signed URL to reach.
 * What comes back is private: the signed copy carries a signature and a bank
 * account number, so it goes into the `mentor-documents` bucket, which is not
 * public, under the mentor's own uid prefix. The upload happens straight from
 * the browser on the mentor's own session -- the storage policy is the
 * authorisation -- and only the resulting path is sent to the edge function.
 */

const AGREEMENT_PDF = "/NovaHost-Mentor-Partnership-Agreement.pdf";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  commissionOption: "A" | "B" | "";
  payoutFrequency: "weekly" | "monthly" | "";
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: "cheque" | "savings" | "other" | "";
  branchName: string;
  branchCode: string;
  signedOn: string;
  documentPath: string;
  documentName: string;
  documentSize: number;
}

const EMPTY: FormState = {
  fullName: "",
  phone: "",
  email: "",
  commissionOption: "",
  payoutFrequency: "",
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  accountType: "",
  branchName: "",
  branchCode: "",
  signedOn: "",
  documentPath: "",
  documentName: "",
  documentSize: 0,
};

const OPTIONS = [
  {
    id: "B" as const,
    title: "Direct sales",
    rate: "15%",
    target: "10 qualifying keys a month",
    body: "You sell licence keys to your own community. Hit the monthly target and every qualifying key that month earns commission.",
  },
  {
    id: "A" as const,
    title: "Giveaway & target",
    rate: "40%",
    target: "50 qualifying keys",
    body: "You run a giveaway of 50–100 keys to build an audience. Once 50 of them are paid for in full, the higher rate applies.",
  },
];

function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[12.5px]">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function Agreement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetchAffiliateSummary();
      setSummary(res);
      const a = res.agreement;
      setForm({
        ...EMPTY,
        fullName: a?.fullName ?? res.mentor.name ?? "",
        phone: a?.phone ?? "",
        email: a?.email ?? res.mentor.email ?? "",
        commissionOption: a?.commissionOption ?? "",
        payoutFrequency: a?.payoutFrequency ?? "",
        bankName: a?.bankName ?? "",
        accountHolder: a?.accountHolder ?? "",
        // Never prefilled: the server returns it masked, and writing "••••1234"
        // back into the column would destroy the real number.
        accountNumber: "",
        accountType: a?.accountType ?? "",
        branchName: a?.branchName ?? "",
        branchCode: a?.branchCode ?? "",
        signedOn: a?.signedOn ?? "",
        documentPath: "",
        documentName: a?.documentName ?? "",
        documentSize: a?.documentSize ?? 0,
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We could not load your agreement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const agreement = summary?.agreement ?? null;
  const status = agreement?.status ?? "draft";
  const locked = status === "approved" || status === "submitted";
  const copy = AGREEMENT_COPY[status];

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ---- Upload -------------------------------------------------------------

  async function onPickFile(file: File | null) {
    if (!file || !user) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "That is not a PDF",
        description: "Sign the agreement, save it as a PDF and upload that.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "That file is too large",
        description: "The signed agreement must be under 10 MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // The uid prefix is what the storage policy authorises on. Timestamped so
      // a re-upload never silently overwrites the copy we may already be
      // reviewing.
      const path = `${user.id}/agreement/${Date.now()}-signed-agreement.pdf`;
      const { error } = await novaHost.storage
        .from("mentor-documents")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw error;

      set("documentPath", path);
      set("documentName", file.name);
      set("documentSize", file.size);
      toast({ title: "Signed agreement attached", description: file.name });
    } catch (e) {
      toast({
        title: "The upload did not go through",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function openUploaded() {
    try {
      const res = await callAffiliate<{ url: string | null }>({
        action: "agreement.document-url",
      });
      if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({
        title: "We could not open that file",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  // ---- Save ---------------------------------------------------------------

  async function save(submit: boolean) {
    setSaving(submit ? "submit" : "draft");
    try {
      await callAffiliate({
        action: "agreement.save",
        submit,
        agreement: {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          commissionOption: form.commissionOption || null,
          payoutFrequency: form.payoutFrequency || null,
          bankName: form.bankName,
          accountHolder: form.accountHolder,
          // Only sent when retyped. An empty string leaves the stored number
          // alone rather than blanking it.
          accountNumber: form.accountNumber || undefined,
          accountType: form.accountType || null,
          branchName: form.branchName,
          branchCode: form.branchCode,
          signedOn: form.signedOn || null,
          documentPath: form.documentPath || undefined,
          documentName: form.documentName || undefined,
          documentSize: form.documentSize || undefined,
        },
      });

      toast({
        title: submit ? "Sent for review" : "Saved",
        description: submit
          ? "We will check your signed agreement and let you know."
          : "Your details are saved. Nothing has been sent yet.",
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

  // ---- Render -------------------------------------------------------------

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

  const hasDocument = Boolean(form.documentPath) || Boolean(agreement?.hasDocument);
  const toneClass = {
    neutral: "",
    pending: "border-warning/40",
    good: "border-success/40",
    bad: "border-destructive/40",
  }[copy.tone];

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
          <Link to="/affiliate">
            <ArrowLeft className="h-3.5 w-3.5" />
            Commission
          </Link>
        </Button>
      </div>

      {/* ---- Status --------------------------------------------------------- */}
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <Alert className={toneClass}>
          {status === "approved" ? (
            <BadgeCheck className="h-4 w-4" />
          ) : status === "submitted" ? (
            <Clock className="h-4 w-4" />
          ) : status === "rejected" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <AlertDescription>
            <strong className="font-medium">{copy.label}.</strong> {copy.body}
            {agreement?.reviewNote && (
              <span className="mt-1.5 block rounded-md border border-border bg-muted/60 px-3 py-2 text-[12.5px]">
                {agreement.reviewNote}
              </span>
            )}
            {status === "approved" && summary && (
              <span className="mt-1.5 block text-[12.5px] text-muted-foreground">
                Option {agreement?.commissionOption} at{" "}
                {(summary.programme.rate * 100).toFixed(0)}%, target{" "}
                {count(summary.programme.target)} qualifying keys, paid{" "}
                {agreement?.payoutFrequency ?? "as agreed"}. Approved{" "}
                {shortDate(agreement?.reviewedAt)}.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* ---- Step 1: the document ------------------------------------------ */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle>1. Read and sign the agreement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <p className="max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
            The Mentor Partnership &amp; Commission Agreement sets out what you may say when you
            promote NovaHost, how a sale is attributed to you, and how commission is worked out and
            paid. Download it, fill in your details, sign it, and upload the signed copy below.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <a href={AGREEMENT_PDF} download="NovaHost-Mentor-Partnership-Agreement.pdf">
                <Download className="h-4 w-4" />
                Download the agreement
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <a href={AGREEMENT_PDF} target="_blank" rel="noopener noreferrer">
                Read it here first
              </a>
            </Button>
          </div>

          <ul className="grid gap-1.5 text-[12.5px] text-muted-foreground sm:grid-cols-2">
            {[
              "Promote honestly — never guarantee profits or returns",
              "A sale counts when it is paid for and verified",
              "Refunds and chargebacks are excluded",
              "You are an independent partner, not an employee",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ---- Step 2: the option -------------------------------------------- */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle>2. Choose your commission model</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {OPTIONS.map((opt) => {
              const selected = form.commissionOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={locked}
                  onClick={() => set("commissionOption", opt.id)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary-muted/60 dark:bg-primary/10"
                      : "border-border hover:bg-muted/60",
                    locked && "cursor-not-allowed opacity-70 hover:bg-transparent",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">
                      Option {opt.id} — {opt.title}
                    </p>
                    <span className="tabular text-lg font-semibold">{opt.rate}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">after {opt.target}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                    {opt.body}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 max-w-[280px]">
            <Field label="How often would you like to be paid?">
              <Select
                value={form.payoutFrequency}
                onValueChange={(v) => set("payoutFrequency", v as FormState["payoutFrequency"])}
                disabled={locked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ---- Step 3: details ----------------------------------------------- */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle>3. Your details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name, as signed" htmlFor="fullName">
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              disabled={locked}
              autoComplete="name"
            />
          </Field>
          <Field label="Phone / WhatsApp" htmlFor="phone">
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={locked}
              inputMode="tel"
              autoComplete="tel"
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={locked}
              autoComplete="email"
            />
          </Field>
          <Field label="Date you signed" htmlFor="signedOn">
            <Input
              id="signedOn"
              type="date"
              value={form.signedOn}
              onChange={(e) => set("signedOn", e.target.value)}
              disabled={locked}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---- Step 4: banking ------------------------------------------------ */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle className="flex items-center gap-2">
            4. Where commission is paid
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <p className="max-w-[70ch] text-[12.5px] text-muted-foreground">
            A South African bank account in your own name, or one you have told us in writing to
            use. Only you and the NovaHost operator can see these details, and the account number is
            masked everywhere except where it is needed to make the payment.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank" htmlFor="bankName">
              <Input
                id="bankName"
                value={form.bankName}
                onChange={(e) => set("bankName", e.target.value)}
                disabled={locked}
                placeholder="Capitec, FNB, Absa…"
              />
            </Field>
            <Field label="Account holder" htmlFor="accountHolder">
              <Input
                id="accountHolder"
                value={form.accountHolder}
                onChange={(e) => set("accountHolder", e.target.value)}
                disabled={locked}
              />
            </Field>
            <Field
              label="Account number"
              htmlFor="accountNumber"
              hint={
                agreement?.accountNumberMasked && !form.accountNumber
                  ? `We have ${agreement.accountNumberMasked} on file. Leave this blank to keep it.`
                  : undefined
              }
            >
              <Input
                id="accountNumber"
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                disabled={locked}
                inputMode="numeric"
                placeholder={agreement?.accountNumberMasked ?? ""}
                autoComplete="off"
              />
            </Field>
            <Field label="Account type">
              <Select
                value={form.accountType}
                onValueChange={(v) => set("accountType", v as FormState["accountType"])}
                disabled={locked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cheque">Cheque / Current</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branch name" htmlFor="branchName">
              <Input
                id="branchName"
                value={form.branchName}
                onChange={(e) => set("branchName", e.target.value)}
                disabled={locked}
              />
            </Field>
            <Field label="Branch code" htmlFor="branchCode">
              <Input
                id="branchCode"
                value={form.branchCode}
                onChange={(e) => set("branchCode", e.target.value)}
                disabled={locked}
                inputMode="numeric"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ---- Step 5: upload -------------------------------------------------- */}
      <Card>
        <CardHeader className="border-b border-border px-5 py-3.5">
          <CardTitle>5. Upload the signed agreement</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />

          {hasDocument ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-success/30 bg-success/10 text-success">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {form.documentName || agreement?.documentName || "Signed agreement.pdf"}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {form.documentPath ? "Ready to send" : "On file"}
                    {form.documentSize > 0 &&
                      ` · ${(form.documentSize / 1024 / 1024).toFixed(2)} MB`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {agreement?.hasDocument && !form.documentPath && (
                  <Button size="sm" variant="outline" onClick={() => void openUploaded()}>
                    View
                  </Button>
                )}
                {!locked && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Replace
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || locked}
              className={cn(
                "flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center transition-colors",
                !locked && "hover:border-primary/50 hover:bg-muted/40",
                locked && "cursor-not-allowed opacity-60",
              )}
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
              <p className="mt-3 text-[14px] font-medium">
                {uploading ? "Uploading…" : "Upload your signed agreement"}
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">PDF, up to 10 MB</p>
            </button>
          )}
        </CardContent>
      </Card>

      {/* ---- Actions --------------------------------------------------------- */}
      {!locked && (
        <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
          <Button
            variant="outline"
            onClick={() => void save(false)}
            disabled={saving !== null || loading}
            className="gap-1.5"
          >
            {saving === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save for later
          </Button>
          <Button
            onClick={() => void save(true)}
            disabled={saving !== null || loading}
            className="gap-1.5"
          >
            {saving === "submit" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send for review
          </Button>
        </div>
      )}

      {locked && status === "submitted" && (
        <p className="pb-2 text-right text-[12.5px] text-muted-foreground">
          Sent {shortDate(agreement?.submittedAt)}. We will be in touch.
        </p>
      )}

      {status === "approved" && agreement?.outdated && (
        <Alert className="border-warning/40">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You signed version {agreement.agreementVersion}. The current agreement is{" "}
            {summary?.programme.agreementVersion}.{" "}
            <Badge variant="secondary" className="ml-1 font-normal">
              Contact support to re-sign
            </Badge>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
