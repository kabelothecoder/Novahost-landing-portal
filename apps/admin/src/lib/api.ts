import { novaHost } from "@/integrations/novahost/client";

/**
 * Every admin read and write goes through an edge function on the service
 * role, never straight at a table.
 *
 * Not for convenience: `licenses`, `profiles` and `trade_logs` are owner-scoped
 * by RLS and an admin is nobody's owner, so a direct select returns an empty
 * list rather than an error — the most dangerous failure mode a dashboard can
 * have, because it looks like "no data" instead of "no permission".
 */

export interface Payment {
  id: string;
  pfPaymentId: string | null;
  createdAt: string;
  email: string | null;
  product: string;
  productLabel: string;
  itemName: string | null;
  gross: number;
  fee: number;
  net: number;
  status: string | null;
  merchantId: string | null;
  live: boolean;
}

export interface Adjustment {
  id: string;
  pfPaymentId: string | null;
  email: string;
  kind: string;
  amount: number;
  currency: string;
  note: string;
  createdAt: string;
}

export interface RevenueSummary {
  grossTotal: number;
  feeTotal: number;
  netTotal: number;
  refundTotal: number;
  realisedTotal: number;
  paidCount: number;
  byProduct: Array<{ product: string; label: string; count: number; gross: number }>;
  series: Array<{ month: string; gross: number; net: number; refunds: number; count: number }>;
  currency: string;
}

export interface OverviewCounts {
  subscriptions: number;
  entitled: number;
  comped: number;
  bound: number;
  expiringSoon: number;
  expired: number;
  licences: number;
  licencesActive: number;
  licencesAutoExecute: number;
  devices: number;
  devicesSeenThisWeek: number;
  mentors: number;
  mentorsPending: number;
  mentorsApproved: number;
  signals: number;
  deliveries: number;
  executions: number;
  executionsFailed: number;
}

export interface SubscriptionRow {
  id: string;
  email: string;
  isPremium: boolean;
  isLifetime: boolean;
  hasScanner: boolean;
  expiry: string | null;
  deviceId: string | null;
  deviceBoundAt: string | null;
  tokenIssuedAt: string | null;
  reactivationCount: number;
  lastReactivatedAt: string | null;
  licenseKey: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  paidTotal: number;
  paidCount: number;
  lastPaidAt: string | null;
  comped: boolean;
}

export interface LicenceRow {
  id: string;
  licenseKey: string | null;
  ownerEmail: string | null;
  status: string;
  issuedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  maxDevices: number;
  isMaster: boolean;
  autoExecute: boolean;
  robot: string | null;
  createdAt: string | null;
  deviceCount: number;
  lastSeenAt: string | null;
  hasSymbolConfig: boolean;
}

export interface MoveTicket {
  id: string;
  email: string;
  targetDeviceId: string | null;
  attempts: number;
  expiresAt: string | null;
  verifiedAt: string | null;
  consumedAt: string | null;
  createdAt: string | null;
  state: "open" | "verified" | "used";
}

export interface SignalRow {
  id: string;
  robot: string | null;
  pair: string | null;
  side: string | null;
  orderType: string | null;
  status: string | null;
  lot: number | null;
  createdAt: string | null;
  delivered: number;
  executedOk: number;
  executedFailed: number;
}

export interface ExecutionFailure {
  id: string;
  signalId: string | null;
  licenseId: string | null;
  status: string | null;
  code: string | null;
  detail: string | null;
  pair: string | null;
  side: string | null;
  executedAt: string | null;
}

export interface PipelineHealth {
  signals: number;
  deliveries: number;
  executions: number;
  executionsFailed: number;
  licences: number;
  autoExecuteOptedIn: number;
  autoExecuteShare: number;
}

export interface MentorRow {
  id: string;
  email: string | null;
  emailVerified: boolean;
  lastSignInAt: string | null;
  fullName: string | null;
  displayName: string | null;
  phone: string | null;
  approvalStatus: string;
  approvedAt: string | null;
  approvalNote: string | null;
  licenseCredits: number;
  licencesIssued: number;
  createdAt: string | null;
}

export interface AppUserRow {
  email: string;
  isPremium: boolean;
  isLifetime: boolean;
  hasScanner: boolean;
  bound: boolean;
  createdAt: string | null;
  spend: number;
}

// ── Affiliate programme ─────────────────────────────────────────────────────

export interface AffiliateSettings {
  optionATarget: number;
  optionARate: number;
  optionBTarget: number;
  optionBRate: number;
  websiteThreshold: number;
  requireScanner: boolean;
  agreementVersion: string;
}

export interface AffiliateMentorRow {
  mentorId: string;
  name: string;
  email: string | null;
  keysIssued: number;
  qualifyingKeys: number;
  awaitingScanner: number;
  qualifyingKeysThisMonth: number;
  qualifyingRevenue: number;
  qualifyingRevenueThisMonth: number;
  robots: number;
  lastSaleAt: string | null;
  conversionPct: number;
  agreementStatus: "none" | "draft" | "submitted" | "approved" | "rejected";
  commissionOption: "A" | "B";
  commissionRate: number;
  target: number;
  targetMet: boolean;
  /** Only ever non-zero for an approved agreement that has met its target. */
  commissionDue: number;
  paidOut: number;
  websiteStatus: string;
  websiteEligible: boolean;
}

export interface AffiliateBotRow {
  eaId: string;
  name: string;
  code: string;
  mentorId: string;
  mentorName: string | null;
  keysIssued: number;
  qualifyingKeys: number;
  qualifyingRevenue: number;
  conversionPct: number;
  lastSaleAt: string | null;
}

export interface AgreementRow {
  mentorId: string;
  mentorName: string;
  mentorEmail: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  commissionOption: "A" | "B" | null;
  payoutFrequency: "weekly" | "monthly" | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  accountType: string | null;
  branchName: string | null;
  branchCode: string | null;
  documentName: string | null;
  hasDocument: boolean;
  signedOn: string | null;
  agreementVersion: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  commissionRate: number | null;
  qualifyingTarget: number | null;
  qualifyingKeys: number;
  keysIssued: number;
}

export interface WebsiteRow {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorEmail: string | null;
  status: "requested" | "in_review" | "approved" | "building" | "live" | "rejected";
  robotName: string | null;
  subdomain: string | null;
  headline: string | null;
  tagline: string | null;
  about: string | null;
  brokerLinks: Array<Record<string, string>>;
  groupLinks: Array<Record<string, string>>;
  results: Array<Record<string, string>>;
  testimonials: Array<Record<string, string>>;
  priceZar: number | null;
  payoutMethod: string | null;
  payoutDetail: string | null;
  requestedAt: string | null;
  reviewNote: string | null;
  liveUrl: string | null;
  qualifyingKeys: number;
  threshold: number;
}

export interface MentorPayoutRow {
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
}

/**
 * Invoke an edge function and unwrap the `{ success, ... }` envelope every one
 * of ours returns.
 *
 * supabase-js only rejects on transport failure, so a 403 arrives as a
 * perfectly ordinary response with `success: false` inside. Left unchecked that
 * renders as an empty table. Throw instead, and let the page show why.
 */
async function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await novaHost.functions.invoke(fn, { body });

  if (error) {
    // FunctionsHttpError keeps the real message in the response body.
    const detail = await (error as { context?: Response }).context
      ?.clone()
      ?.json()
      .catch(() => null);
    throw new Error(detail?.error || error.message || "Request failed.");
  }
  if (!data?.success) throw new Error(data?.error || "Request failed.");
  return data as T;
}

export const api = {
  overview: () =>
    call<{
      revenue: RevenueSummary;
      counts: OverviewCounts;
      recentPayments: Payment[];
      sandboxCount: number;
      failedCount: number;
    }>("admin-analytics", { action: "overview" }),

  revenue: () =>
    call<{
      revenue: RevenueSummary;
      payments: Payment[];
      sandbox: Payment[];
      failed: Payment[];
      duplicates: number;
      adjustments: Adjustment[];
      liveMerchantId: string;
    }>("admin-analytics", { action: "revenue" }),

  subscriptions: () =>
    call<{ rows: SubscriptionRow[] }>("admin-analytics", { action: "subscriptions" }),

  licences: () =>
    call<{ rows: LicenceRow[]; tickets: MoveTicket[]; deviceTotal: number }>("admin-analytics", {
      action: "licenses",
    }),

  signals: () =>
    call<{ rows: SignalRow[]; failures: ExecutionFailure[]; health: PipelineHealth }>(
      "admin-analytics",
      { action: "signals" },
    ),

  directory: () =>
    call<{ mentors: MentorRow[]; appUsers: AppUserRow[] }>("admin-analytics", {
      action: "directory",
    }),

  createAdjustment: (input: {
    email: string;
    amount: number;
    kind: "refund" | "chargeback" | "correction";
    note: string;
    pfPaymentId?: string | null;
  }) => call<Record<string, never>>("admin-analytics", { action: "adjustment.create", ...input }),

  deleteAdjustment: (id: string) =>
    call<Record<string, never>>("admin-analytics", { action: "adjustment.delete", id }),

  // ── Comp access (the grant/revoke function that used to live in the portal)
  accessList: () =>
    call<{
      rows: Array<{
        email: string;
        appAccess: boolean;
        lifetime: boolean;
        scanner: boolean;
        expiry: string | null;
        deviceBound: boolean;
        createdAt: string | null;
      }>;
    }>("admin-grant-access", { action: "list" }),

  accessGrant: (input: {
    email: string;
    appAccess: boolean;
    scanner: boolean;
    lifetime: boolean;
    expiry: string | null;
  }) => call<Record<string, never>>("admin-grant-access", { action: "grant", ...input }),

  accessRevoke: (email: string) =>
    call<Record<string, never>>("admin-grant-access", { action: "revoke", email }),

  // ── Mentor approvals
  approvalsList: () =>
    call<{
      rows: Array<{
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
      }>;
    }>("admin-approve-mentor", { action: "list" }),

  approvalsDecide: (userId: string, action: "approve" | "reject", note?: string) =>
    call<Record<string, never>>("admin-approve-mentor", { action, userId, note }),

  // ── Affiliate programme
  //
  // Note these do NOT recompute commission in the browser. Every figure comes
  // from the same SQL views the mentor portal reads, so a mentor and an admin
  // looking at the same month are never shown two different numbers.
  affiliateOverview: () =>
    call<{
      settings: AffiliateSettings;
      totals: {
        mentors: number;
        qualifyingKeys: number;
        qualifyingRevenue: number;
        commissionDue: number;
        paidOut: number;
        agreementsPending: number;
        websitesPending: number;
        unattributedRevenue: number;
        unattributedPayments: number;
      };
      mentors: AffiliateMentorRow[];
      robots: AffiliateBotRow[];
    }>("admin-affiliate", { action: "overview" }),

  agreementsList: () =>
    call<{
      agreements: AgreementRow[];
      defaults: {
        optionARate: number;
        optionATarget: number;
        optionBRate: number;
        optionBTarget: number;
      };
    }>("admin-affiliate", { action: "agreements" }),

  agreementDecide: (input: {
    mentorId: string;
    decision: "approve" | "reject";
    note?: string;
    commissionRate?: number;
    qualifyingTarget?: number;
  }) => call<Record<string, never>>("admin-affiliate", { action: "agreement.decide", ...input }),

  /** A 5-minute signed URL for the signed PDF. The bucket is private. */
  agreementDocumentUrl: (mentorId: string) =>
    call<{ url: string | null }>("admin-affiliate", {
      action: "agreement.document-url",
      mentorId,
    }),

  affiliateMentor: (mentorId: string) =>
    call<{
      mentor: { id: string; name: string; email: string | null };
      sales: Array<{
        licenseKey: string;
        issuedAt: string;
        paidAt: string | null;
        buyerEmail: string | null;
        gross: number;
      }>;
      payouts: MentorPayoutRow[];
    }>("admin-affiliate", { action: "mentor", mentorId }),

  payoutCreate: (input: {
    mentorId: string;
    periodStart: string;
    periodEnd: string;
    amount?: number;
    reference?: string;
    note?: string;
  }) =>
    call<{ qualifyingKeys: number; grossRevenue: number; amount: number }>("admin-affiliate", {
      action: "payout.create",
      ...input,
    }),

  payoutUpdate: (payoutId: string, status: "pending" | "paid" | "cancelled", reference?: string) =>
    call<Record<string, never>>("admin-affiliate", {
      action: "payout.update",
      payoutId,
      status,
      reference,
    }),

  websitesList: () => call<{ websites: WebsiteRow[] }>("admin-affiliate", { action: "websites" }),

  websiteDecide: (input: {
    websiteId: string;
    decision: "in_review" | "approved" | "building" | "live" | "rejected";
    note?: string;
    liveUrl?: string;
  }) => call<Record<string, never>>("admin-affiliate", { action: "website.decide", ...input }),

  affiliateSettingsUpdate: (settings: Partial<AffiliateSettings>) =>
    call<Record<string, never>>("admin-affiliate", { action: "settings.update", settings }),
};
