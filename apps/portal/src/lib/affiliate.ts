import { novaHost } from "@/integrations/novahost/client";

/**
 * The mentor's side of the affiliate programme, as the browser sees it.
 *
 * Every figure here comes from the `mentor-affiliate` edge function, never from
 * a direct table read: the commission views sit on top of `itn_logs`, which no
 * mentor may select from, so a browser query would return an empty list rather
 * than an error. If you find yourself adding `novaHost.from("affiliate_...")`
 * anywhere in this app, that is why it silently returns nothing.
 */

export interface AffiliateProgramme {
  option: "A" | "B";
  optionLabel: string;
  rate: number;
  /** False until the agreement is approved: the rate shown is indicative. */
  rateInForce: boolean;
  target: number;
  payoutFrequency: "weekly" | "monthly" | null;
  requireScanner: boolean;
  websiteThreshold: number;
  agreementVersion: string;
  currency: string;
}

export interface AffiliateScoreboard {
  keysIssued: number;
  appPaidKeys: number;
  scannerPaidKeys: number;
  qualifyingKeys: number;
  awaitingScanner: number;
  qualifyingKeysThisMonth: number;
  qualifyingRevenueThisMonth: number;
  qualifyingRevenue: number;
  grossRevenue: number;
  robots: number;
  lastSaleAt: string | null;
  /** Count measured against the target: monthly on Option B, lifetime on A. */
  progressCount: number;
  targetMet: boolean;
  earnedThisMonth: number;
  earnedLifetime: number;
  paidOut: number;
}

export type AgreementStatus = "draft" | "submitted" | "approved" | "rejected";

export interface AffiliateAgreement {
  status: AgreementStatus;
  commissionOption: "A" | "B" | null;
  payoutFrequency: "weekly" | "monthly" | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumberMasked: string | null;
  accountType: "cheque" | "savings" | "other" | null;
  branchName: string | null;
  branchCode: string | null;
  documentName: string | null;
  documentSize: number | null;
  hasDocument: boolean;
  signedOn: string | null;
  agreementVersion: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  outdated: boolean;
}

export type WebsiteStatus =
  | "draft"
  | "requested"
  | "in_review"
  | "approved"
  | "building"
  | "live"
  | "rejected";

export interface LinkItem {
  label?: string;
  url?: string;
  note?: string;
  platform?: string;
  caption?: string;
  path?: string;
  posted_on?: string;
  name?: string;
  handle?: string;
  quote?: string;
}

export interface AffiliateWebsite {
  status: WebsiteStatus;
  eaId: string | null;
  subdomain: string | null;
  headline: string | null;
  tagline: string | null;
  about: string | null;
  accentColor: string | null;
  brokerLinks: LinkItem[];
  groupLinks: LinkItem[];
  results: LinkItem[];
  testimonials: LinkItem[];
  priceZar: number | null;
  payoutMethod: string | null;
  payoutDetail: string | null;
  requestedAt: string | null;
  reviewNote: string | null;
  liveUrl: string | null;
}

export interface AffiliateRobot {
  eaId: string;
  name: string;
  keysIssued: number;
  qualifyingKeys: number;
  qualifyingRevenue: number;
  conversionPct: number;
  lastSaleAt: string | null;
}

export interface AffiliateSale {
  licenseId: string;
  licenseKey: string;
  eaId: string | null;
  issuedAt: string;
  appPaid: boolean;
  scannerPaid: boolean;
  paidAt: string | null;
  buyerEmail: string | null;
  gross: number;
  qualified: boolean;
}

export interface AffiliatePayout {
  id: string;
  periodStart: string;
  periodEnd: string;
  qualifyingKeys: number;
  grossRevenue: number;
  commissionRate: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  paidAt: string | null;
  reference: string | null;
  note: string | null;
}

export interface AffiliateSummary {
  mentor: { id: string; name: string; email: string | null };
  programme: AffiliateProgramme;
  month: { label: string; start: string; end: string };
  scoreboard: AffiliateScoreboard;
  agreement: AffiliateAgreement | null;
  website: AffiliateWebsite | null;
  robots: AffiliateRobot[];
  sales: AffiliateSale[];
  payouts: AffiliatePayout[];
}

/**
 * One call into the edge function.
 *
 * `invoke` puts a non-2xx body inside an error object rather than returning it,
 * so the server's own sentence -- "you still need a branch code", "that address
 * is taken" -- would be replaced by "Edge Function returned a non-2xx status
 * code" unless it is dug back out. That message is the whole point of the
 * validation, so it is dug back out.
 */
export async function callAffiliate<T = unknown>(
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await novaHost.functions.invoke("mentor-affiliate", { body });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) throw new Error(String(parsed.error));
      } catch (inner) {
        if (inner instanceof Error && inner.message && !/JSON|Unexpected/i.test(inner.message)) {
          throw inner;
        }
      }
    }
    throw new Error(error.message || "We could not reach the server.");
  }

  const payload = data as { success?: boolean; error?: string };
  if (payload && payload.success === false) {
    throw new Error(payload.error || "That did not work.");
  }
  return data as T;
}

export const fetchAffiliateSummary = () =>
  callAffiliate<AffiliateSummary & { success: true }>({ action: "summary" });

/** Rand, whole cents, never a bare number that could be read as anything else. */
export const rand = (n: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const count = (n: number) => new Intl.NumberFormat("en-ZA").format(n ?? 0);

export const shortDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
    : "—";

/** How each agreement state reads to the mentor looking at it. */
export const AGREEMENT_COPY: Record<
  AgreementStatus,
  { label: string; tone: "neutral" | "pending" | "good" | "bad"; body: string }
> = {
  draft: {
    label: "Not submitted",
    tone: "neutral",
    body: "Your details are saved but nothing has been sent to us yet.",
  },
  submitted: {
    label: "With us for review",
    tone: "pending",
    body: "We are checking your signed agreement. You will see the result here.",
  },
  approved: {
    label: "Approved",
    tone: "good",
    body: "Your commission terms are live. Qualifying sales now earn.",
  },
  rejected: {
    label: "Sent back",
    tone: "bad",
    body: "Something needs fixing before we can approve it. See the note below.",
  },
};

export const WEBSITE_COPY: Record<WebsiteStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "neutral" },
  requested: { label: "Requested", tone: "pending" },
  in_review: { label: "Being reviewed", tone: "pending" },
  approved: { label: "Approved", tone: "good" },
  building: { label: "Being built", tone: "pending" },
  live: { label: "Live", tone: "good" },
  rejected: { label: "Sent back", tone: "bad" },
};
