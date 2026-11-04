import type { AffiliateSummary } from "@/lib/affiliate";

/**
 * Illustrative figures for presenting the commission page to prospective
 * mentors. Opened with `/affiliate?example=1`. Never fetched, never written,
 * and the page shows a permanent "Example figures" banner while it is in use,
 * so nobody can mistake these numbers for a real mentor's earnings.
 */
export function isExampleMode(): boolean {
  return new URLSearchParams(window.location.search).get("example") === "1";
}

const RATE = 0.3;
const KEY_PRICE = 350;

function payout(i: number, start: string, end: string) {
  const keys = 300;
  return {
    id: `example-${i}`,
    periodStart: start,
    periodEnd: end,
    qualifyingKeys: keys,
    grossRevenue: keys * KEY_PRICE,
    commissionRate: RATE,
    amount: 31_500,
    status: "paid" as const,
    paidAt: end,
    reference: null,
    note: null,
  };
}

export function exampleSummary(): AffiliateSummary {
  const now = new Date();
  const today = now.toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  const monthsAgo = (n: number, day: number) =>
    new Date(now.getFullYear(), now.getMonth() - n, day).toISOString();

  const thisMonthKeys = Math.round(18_540 / RATE / KEY_PRICE); // 177 keys -> ~R18,540

  return {
    mentor: { id: "example", name: "Example Mentor", email: null },
    programme: {
      option: "B",
      optionLabel: "Monthly commission",
      rate: RATE,
      rateInForce: true,
      target: 10,
      payoutFrequency: "monthly",
      requireScanner: false,
      websiteThreshold: 30,
      agreementVersion: "example",
      currency: "ZAR",
    },
    month: {
      label: now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" }),
      start: monthStart,
      end: monthEnd,
    },
    scoreboard: {
      keysIssued: 1_640,
      appPaidKeys: 1_377,
      scannerPaidKeys: 820,
      qualifyingKeys: 1_377,
      awaitingScanner: 0,
      qualifyingKeysThisMonth: thisMonthKeys,
      qualifyingRevenueThisMonth: thisMonthKeys * KEY_PRICE,
      qualifyingRevenue: 1_377 * KEY_PRICE,
      grossRevenue: 1_377 * KEY_PRICE,
      robots: 2,
      lastSaleAt: today,
      progressCount: thisMonthKeys,
      targetMet: true,
      earnedThisMonth: 18_540,
      earnedLifetime: 18_540 + 4 * 31_500,
      paidOut: 4 * 31_500,
    },
    agreement: {
      status: "approved",
      commissionOption: "B",
      payoutFrequency: "monthly",
      fullName: null, phone: null, email: null, bankName: null, accountHolder: null,
      accountNumberMasked: null, accountType: null, branchName: null, branchCode: null,
      documentName: null, documentSize: null, hasDocument: false, signedOn: null,
      agreementVersion: "example", submittedAt: null, reviewedAt: null, reviewNote: null,
      outdated: false,
    },
    website: null,
    robots: [
      { eaId: "ex-1", name: "Gold Scalper (example)", keysIssued: 1_020, qualifyingKeys: 870, qualifyingRevenue: 870 * KEY_PRICE, conversionPct: 85.3, lastSaleAt: today },
      { eaId: "ex-2", name: "NAS100 Breakout (example)", keysIssued: 620, qualifyingKeys: 507, qualifyingRevenue: 507 * KEY_PRICE, conversionPct: 81.8, lastSaleAt: today },
    ],
    sales: Array.from({ length: 8 }, (_, i) => ({
      licenseId: `ex-sale-${i}`,
      licenseKey: `EXAMPLE-${String(1000 + i)}`,
      eaId: i % 2 ? "ex-2" : "ex-1",
      issuedAt: new Date(now.getTime() - i * 6 * 3600_000).toISOString(),
      appPaid: true,
      scannerPaid: i % 3 !== 0,
      paidAt: today,
      buyerEmail: "student@example.com",
      gross: KEY_PRICE,
      qualified: true,
    })),
    payouts: [1, 2, 3, 4].map((n) => payout(n, monthsAgo(n, 1), monthsAgo(n - 1, 0))),
  };
}
