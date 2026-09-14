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
};
