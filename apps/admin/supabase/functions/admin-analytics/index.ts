import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Read model for the admin portal.
 *
 * One function, several actions, because every one of them needs the same two
 * things: the service role (most of these tables are owner-scoped by RLS and an
 * admin is not the owner of anybody's row) and the same admin check.
 *
 * AUTH: a signed-in user who appears in `public.admin_users`, on a session that
 * has cleared two-factor. `verify_jwt` is on but that alone is NOT enough --
 * the project's anon key is itself a valid signed JWT and ships inside the
 * mobile app -- so the body calls `auth.getUser()`, checks `admin_users`, and
 * then requires aal2.
 *
 * Everything here is a read except `adjustment.create` / `adjustment.delete`,
 * which write the refunds ledger.
 *
 * ── On where revenue comes from ──────────────────────────────────────────────
 * There is no orders table and never has been. `itn_logs` holds the raw PayFast
 * ITN payloads, written only after the signature, the source IP and the
 * server-to-server validation have all passed, so it is the one authentic
 * record of money received. This function reads it as a ledger.
 *
 * Two consequences that the UI has to respect and so does anyone editing this:
 *
 *   1. Old sandbox tests are in there, at a different merchant id. They are
 *      separated out rather than deleted -- a revenue view that silently drops
 *      rows is worse than one that shows you what it dropped.
 *   2. Money out is not in there at all. `payment_adjustments` carries refunds
 *      and chargebacks, and net revenue is gross minus those.
 */

/** PayFast merchant id for the live account. Sandbox rows carry a different
 *  one and are quarantined, not counted. Overridable so a future merchant
 *  change is a dashboard edit, not a redeploy. */
const LIVE_MERCHANT_ID = Deno.env.get("PAYFAST_MERCHANT_ID") ?? "30871595";

/** What each product is called once it has left PayFast's item_name. */
const PRODUCT_LABEL: Record<string, string> = {
  LIFETIME: "App access",
  SCANNER: "AI chart scanner",
  REACTIVATION: "Device move",
};

type Action =
  | "overview"
  | "revenue"
  | "subscriptions"
  | "licenses"
  | "signals"
  | "directory"
  | "adjustment.create"
  | "adjustment.delete";

interface Body {
  action?: Action;
  /** adjustment.create */
  pfPaymentId?: string | null;
  email?: string;
  kind?: "refund" | "chargeback" | "correction";
  amount?: number;
  note?: string;
  /** adjustment.delete */
  id?: string;
}

/** One payment, normalised out of a raw ITN payload. */
interface Payment {
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

const num = (v: unknown): number => {
  const n = Number.parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

/** YYYY-MM in UTC. Grouping key for every month series below. */
const monthKey = (iso: string): string => iso.slice(0, 7);

/**
 * Turn `itn_logs` rows into payments.
 *
 * Deduplicates on pf_payment_id. The webhook already refuses a replayed id, so
 * a duplicate here would mean something went wrong upstream -- but a revenue
 * total is the last place you want to find out about it by double-counting.
 */
function toPayments(rows: Array<{ id: string; payload: Record<string, unknown>; created_at: string }>): {
  payments: Payment[];
  duplicates: number;
} {
  const seen = new Set<string>();
  const payments: Payment[] = [];
  let duplicates = 0;

  for (const row of rows) {
    const p = row.payload ?? {};
    const pfPaymentId = (p.pf_payment_id as string) ?? null;

    if (pfPaymentId) {
      if (seen.has(pfPaymentId)) {
        duplicates += 1;
        continue;
      }
      seen.add(pfPaymentId);
    }

    const product = String(p.custom_str1 ?? "UNKNOWN").toUpperCase();
    const merchantId = (p.merchant_id as string) ?? null;

    payments.push({
      id: row.id,
      pfPaymentId,
      createdAt: row.created_at,
      // custom_str3 is the email the app sent to checkout; email_address is
      // whatever the payer typed into PayFast. The first is the one
      // entitlements are keyed on, so it wins.
      email: ((p.custom_str3 as string) || (p.email_address as string) || "").toLowerCase() || null,
      product,
      productLabel: PRODUCT_LABEL[product] ?? product,
      itemName: (p.item_name as string) ?? null,
      gross: num(p.amount_gross ?? p.gross_amount),
      // PayFast reports the fee as a negative. Store it positive; the sign is
      // the caller's business, not the number's.
      fee: Math.abs(num(p.amount_fee)),
      net: num(p.amount_net),
      status: (p.payment_status as string) ?? null,
      merchantId,
      live: merchantId === LIVE_MERCHANT_ID,
    });
  }

  return { payments, duplicates };
}

/** A payment only counts toward revenue when it is live and completed. */
const counts = (p: Payment) => p.live && p.status === "COMPLETE";

/**
 * The assurance level of a token that has ALREADY been verified.
 *
 * `auth.getUser(jwt)` checks the signature against the auth server, so by the
 * time this is called the token is authentic and reading its payload is safe.
 * Never call it on a token that has not been through getUser first.
 *
 * "aal1" means the caller knew a password. "aal2" means they also proved
 * possession of an enrolled authenticator. This function returns every rand
 * the business has taken and every customer's entitlement, so a stolen
 * password on its own must not open it.
 */
function assuranceLevel(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return typeof claims.aal === "string" ? claims.aal : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });

  try {
    const svc = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ---- Who is asking ----------------------------------------------------
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ success: false, error: "Not authorised." }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser(jwt);
    if (authErr || !user) {
      // Handing the anon key here returns no user -- that is the point.
      return json({ success: false, error: "Not authorised." }, 401);
    }

    const { data: admin, error: adminErr } = await svc
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminErr) throw adminErr;
    if (!admin) {
      console.warn("[admin-analytics] rejected non-admin " + user.id);
      return json({ success: false, error: "Not authorised." }, 403);
    }

    // Knowing the password is not enough to open this.
    if (assuranceLevel(jwt) !== "aal2") {
      console.warn("[admin-analytics] refused an aal1 session for " + user.id);
      return json(
        {
          success: false,
          error: "Two-factor authentication is required for the admin console.",
          code: "mfa_required",
        },
        403,
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const action: Action = body.action ?? "overview";

    // ---- Shared loaders ---------------------------------------------------

    const loadPayments = async () => {
      const { data, error } = await svc
        .from("itn_logs")
        .select("id, payload, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toPayments((data ?? []) as never);
    };

    const loadAdjustments = async () => {
      const { data, error } = await svc
        .from("payment_adjustments")
        .select("id, pf_payment_id, email, kind, amount, currency, note, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((a) => ({
        id: a.id as string,
        pfPaymentId: a.pf_payment_id as string | null,
        email: a.email as string,
        kind: a.kind as string,
        amount: num(a.amount),
        currency: a.currency as string,
        note: a.note as string,
        createdAt: a.created_at as string,
      }));
    };

    // ---- adjustment.create -----------------------------------------------
    if (action === "adjustment.create") {
      const email = (body.email ?? "").trim().toLowerCase();
      const amount = Number(body.amount);
      const note = (body.note ?? "").trim();
      const kind = body.kind ?? "refund";

      if (!email.includes("@")) return json({ success: false, error: "A valid email is required." }, 400);
      if (!Number.isFinite(amount) || amount <= 0)
        return json({ success: false, error: "Amount must be a positive number." }, 400);
      if (!note) return json({ success: false, error: "A note is required." }, 400);
      if (!["refund", "chargeback", "correction"].includes(kind))
        return json({ success: false, error: "Unknown adjustment kind." }, 400);

      const { error } = await svc.from("payment_adjustments").insert({
        pf_payment_id: (body.pfPaymentId ?? "").trim() || null,
        email,
        kind,
        amount,
        note,
        created_by: user.id,
      });
      if (error) throw error;

      console.log(
        "[admin-analytics] " + (user.email ?? user.id) + " recorded a " + kind + " of R" + amount + " for " + email,
      );
      return json({ success: true });
    }

    // ---- adjustment.delete -----------------------------------------------
    if (action === "adjustment.delete") {
      const id = (body.id ?? "").trim();
      if (!id) return json({ success: false, error: "Which adjustment?" }, 400);

      const { error } = await svc.from("payment_adjustments").delete().eq("id", id);
      if (error) throw error;

      console.log("[admin-analytics] " + (user.email ?? user.id) + " deleted adjustment " + id);
      return json({ success: true });
    }

    // ---- revenue ----------------------------------------------------------
    if (action === "revenue" || action === "overview") {
      const { payments, duplicates } = await loadPayments();
      const adjustments = await loadAdjustments();

      const real = payments.filter(counts);
      const sandbox = payments.filter((p) => !p.live);
      const failed = payments.filter((p) => p.live && p.status !== "COMPLETE");

      const grossTotal = real.reduce((s, p) => s + p.gross, 0);
      const feeTotal = real.reduce((s, p) => s + p.fee, 0);
      const netTotal = real.reduce((s, p) => s + p.net, 0);
      const refundTotal = adjustments.reduce((s, a) => s + a.amount, 0);

      // By product.
      const byProduct = new Map<string, { product: string; label: string; count: number; gross: number }>();
      for (const p of real) {
        const row = byProduct.get(p.product) ?? {
          product: p.product,
          label: p.productLabel,
          count: 0,
          gross: 0,
        };
        row.count += 1;
        row.gross += p.gross;
        byProduct.set(p.product, row);
      }

      // By month, gross in and adjustments out on the same key so the chart can
      // show both without a second pass.
      const months = new Map<string, { month: string; gross: number; net: number; refunds: number; count: number }>();
      const bump = (key: string) =>
        months.get(key) ?? { month: key, gross: 0, net: 0, refunds: 0, count: 0 };
      for (const p of real) {
        const k = monthKey(p.createdAt);
        const row = bump(k);
        row.gross += p.gross;
        row.net += p.net;
        row.count += 1;
        months.set(k, row);
      }
      for (const a of adjustments) {
        const k = monthKey(a.createdAt);
        const row = bump(k);
        row.refunds += a.amount;
        months.set(k, row);
      }
      const series = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));

      const revenue = {
        grossTotal,
        feeTotal,
        netTotal,
        refundTotal,
        /** What the business actually kept: what PayFast paid out, less refunds. */
        realisedTotal: netTotal - refundTotal,
        paidCount: real.length,
        byProduct: [...byProduct.values()].sort((a, b) => b.gross - a.gross),
        series,
        currency: "ZAR",
      };

      if (action === "revenue") {
        return json({
          success: true,
          revenue,
          payments: real,
          sandbox,
          failed,
          duplicates,
          adjustments,
          liveMerchantId: LIVE_MERCHANT_ID,
        });
      }

      // ---- overview: revenue plus the counts worth seeing on one screen ----
      const [subsRes, licRes, actRes, profRes, sigRes, delRes, execRes] = await Promise.all([
        svc.from("subscriptions").select("email, is_premium, is_lifetime, has_scanner, subscription_expiry, device_id, created_at"),
        svc.from("licenses").select("id, status, auto_execute, created_at"),
        svc.from("device_activations").select("id, status, last_seen_at"),
        svc.from("profiles").select("id, approval_status, created_at"),
        svc.from("signals").select("id, created_at"),
        svc.from("signal_deliveries").select("id, claimed_at"),
        svc.from("signal_executions").select("id, status, executed_at"),
      ]);

      for (const r of [subsRes, licRes, actRes, profRes, sigRes, delRes, execRes]) {
        if (r.error) throw r.error;
      }

      const subs = subsRes.data ?? [];
      const licences = licRes.data ?? [];
      const activations = actRes.data ?? [];
      const profiles = profRes.data ?? [];

      const paidEmails = new Set(real.map((p) => p.email).filter(Boolean) as string[]);
      const now = Date.now();
      const DAY = 86_400_000;

      const entitled = subs.filter((s) => s.is_premium || s.is_lifetime || s.has_scanner);
      const comped = entitled.filter((s) => !paidEmails.has(String(s.email ?? "").toLowerCase()));

      const expiringSoon = subs.filter((s) => {
        if (!s.subscription_expiry) return false;
        const t = new Date(s.subscription_expiry as string).getTime();
        return t > now && t - now < 30 * DAY;
      });
      const expired = subs.filter((s) => {
        if (!s.subscription_expiry) return false;
        return new Date(s.subscription_expiry as string).getTime() <= now;
      });

      const seenRecently = activations.filter(
        (a) => a.last_seen_at && now - new Date(a.last_seen_at as string).getTime() < 7 * DAY,
      );

      const execRows = execRes.data ?? [];
      const isGood = (s: unknown) => s === "filled" || s === "ok" || s === "success";

      return json({
        success: true,
        revenue,
        counts: {
          subscriptions: subs.length,
          entitled: entitled.length,
          comped: comped.length,
          bound: subs.filter((s) => s.device_id).length,
          expiringSoon: expiringSoon.length,
          expired: expired.length,
          licences: licences.length,
          licencesActive: licences.filter((l) => l.status === "active").length,
          licencesAutoExecute: licences.filter((l) => l.auto_execute).length,
          devices: activations.length,
          devicesSeenThisWeek: seenRecently.length,
          mentors: profiles.length,
          mentorsPending: profiles.filter((p) => p.approval_status === "pending").length,
          mentorsApproved: profiles.filter((p) => p.approval_status === "approved").length,
          signals: (sigRes.data ?? []).length,
          deliveries: (delRes.data ?? []).length,
          executions: execRows.length,
          executionsFailed: execRows.filter((e) => !isGood(e.status)).length,
        },
        recentPayments: real.slice(0, 8),
        sandboxCount: sandbox.length,
        failedCount: failed.length,
      });
    }

    // ---- subscriptions -----------------------------------------------------
    if (action === "subscriptions") {
      const { payments } = await loadPayments();
      const real = payments.filter(counts);

      const { data, error } = await svc
        .from("subscriptions")
        .select(
          "id, email, is_premium, is_lifetime, has_scanner, subscription_expiry, device_id, device_bound_at, token_issued_at, reactivation_count, last_reactivated_at, license_key, created_at, updated_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      // What each email has actually paid, so the row can say "comped" with
      // some authority instead of guessing from a flag.
      const paidBy = new Map<string, { total: number; count: number; last: string | null }>();
      for (const p of real) {
        if (!p.email) continue;
        const row = paidBy.get(p.email) ?? { total: 0, count: 0, last: null };
        row.total += p.gross;
        row.count += 1;
        if (!row.last || p.createdAt > row.last) row.last = p.createdAt;
        paidBy.set(p.email, row);
      }

      const rows = (data ?? []).map((s) => {
        const email = String(s.email ?? "").toLowerCase();
        const paid = paidBy.get(email);
        const entitled = Boolean(s.is_premium || s.is_lifetime || s.has_scanner);
        return {
          id: s.id as string,
          email,
          isPremium: Boolean(s.is_premium),
          isLifetime: Boolean(s.is_lifetime),
          hasScanner: Boolean(s.has_scanner),
          expiry: (s.subscription_expiry as string) ?? null,
          deviceId: (s.device_id as string) ?? null,
          deviceBoundAt: (s.device_bound_at as string) ?? null,
          tokenIssuedAt: (s.token_issued_at as string) ?? null,
          reactivationCount: (s.reactivation_count as number) ?? 0,
          lastReactivatedAt: (s.last_reactivated_at as string) ?? null,
          licenseKey: (s.license_key as string) ?? null,
          createdAt: (s.created_at as string) ?? null,
          updatedAt: (s.updated_at as string) ?? null,
          paidTotal: paid?.total ?? 0,
          paidCount: paid?.count ?? 0,
          lastPaidAt: paid?.last ?? null,
          /** Entitled without ever having paid: an admin grant, or a comp. */
          comped: entitled && !paid,
        };
      });

      return json({ success: true, rows });
    }

    // ---- licenses ----------------------------------------------------------
    if (action === "licenses") {
      const [licRes, actRes, eaRes, ticketRes, cfgRes, mentorRes, saleRes] = await Promise.all([
        svc
          .from("licenses")
          .select(
            "id, license_key, owner_email, owner_id, user_id, status, issued_at, expires_at, max_devices, ea_id, is_master, auto_execute, created_at",
          )
          .order("created_at", { ascending: false }),
        svc.from("device_activations").select("id, license_id, device_id, status, activated_at, last_seen_at"),
        svc.from("expert_advisors").select("id, code, name, display_name"),
        svc
          .from("device_move_tickets")
          .select("id, email, target_device_id, attempts, expires_at, verified_at, consumed_at, created_at")
          .order("created_at", { ascending: false }),
        svc.from("license_symbol_config").select("license_id"),
        svc.from("profiles").select("id, full_name, display_name"),
        // Whether the app was actually paid for, not whether a key was issued
        // -- CLAUDE.md: "Generating a licence key is not a sale." Reads the
        // service role only; the view revokes anon/authenticated entirely.
        svc.from("affiliate_license_sales").select("license_id, app_paid"),
      ]);
      for (const r of [licRes, actRes, eaRes, ticketRes, cfgRes, mentorRes, saleRes]) if (r.error) throw r.error;

      const mentorById = new Map(
        (mentorRes.data ?? []).map((p) => [
          String(p.id),
          (p.display_name as string) || (p.full_name as string) || null,
        ]),
      );
      const appPaidByLicense = new Map(
        (saleRes.data ?? []).map((s) => [String(s.license_id), Boolean(s.app_paid)]),
      );

      const activations = actRes.data ?? [];
      const byLicence = new Map<string, typeof activations>();
      for (const a of activations) {
        const key = String(a.license_id);
        const list = byLicence.get(key) ?? [];
        list.push(a);
        byLicence.set(key, list);
      }

      // signals.ea_id is text while expert_advisors.id is a uuid, so the join
      // is by whichever of id/code the text happens to match. Index both.
      const eaByAny = new Map<string, string>();
      for (const ea of eaRes.data ?? []) {
        const label = (ea.display_name as string) || (ea.name as string) || (ea.code as string) ||
          "Unnamed robot";
        if (ea.id) eaByAny.set(String(ea.id), label);
        if (ea.code) eaByAny.set(String(ea.code), label);
      }

      const symbolConfigured = new Set((cfgRes.data ?? []).map((c) => String(c.license_id)));
      const now = Date.now();

      const rows = (licRes.data ?? []).map((l) => {
        const devices = byLicence.get(String(l.id)) ?? [];
        const lastSeen = devices
          .map((d) => d.last_seen_at as string | null)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;
        return {
          id: l.id as string,
          licenseKey: (l.license_key as string) ?? null,
          ownerEmail: (l.owner_email as string) ?? null,
          status: (l.status as string) ?? "unknown",
          issuedAt: (l.issued_at as string) ?? null,
          expiresAt: (l.expires_at as string) ?? null,
          expired: Boolean(l.expires_at && new Date(l.expires_at as string).getTime() <= now),
          maxDevices: (l.max_devices as number) ?? 1,
          isMaster: Boolean(l.is_master),
          autoExecute: Boolean(l.auto_execute),
          robot: l.ea_id ? eaByAny.get(String(l.ea_id)) ?? String(l.ea_id) : null,
          mentor: l.user_id ? mentorById.get(String(l.user_id)) ?? null : null,
          appPaid: appPaidByLicense.get(String(l.id)) ?? null,
          createdAt: (l.created_at as string) ?? null,
          deviceCount: devices.length,
          lastSeenAt: lastSeen,
          hasSymbolConfig: symbolConfigured.has(String(l.id)),
        };
      });

      const tickets = (ticketRes.data ?? []).map((t) => ({
        id: t.id as string,
        email: t.email as string,
        targetDeviceId: (t.target_device_id as string) ?? null,
        attempts: (t.attempts as number) ?? 0,
        expiresAt: (t.expires_at as string) ?? null,
        verifiedAt: (t.verified_at as string) ?? null,
        consumedAt: (t.consumed_at as string) ?? null,
        createdAt: (t.created_at as string) ?? null,
        state: t.consumed_at ? "used" : t.verified_at ? "verified" : "open",
      }));

      return json({ success: true, rows, tickets, deviceTotal: activations.length });
    }

    // ---- signals -----------------------------------------------------------
    if (action === "signals") {
      const [sigRes, delRes, execRes, licRes, eaRes] = await Promise.all([
        svc
          .from("signals")
          .select("id, ea_id, pair, side, type, order_type, status, lot, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        svc.from("signal_deliveries").select("id, signal_id, license_id, claimed_at"),
        svc.from("signal_executions").select("id, signal_id, license_id, status, code, detail, pair, side, executed_at"),
        svc.from("licenses").select("id, auto_execute, status, owner_email"),
        svc.from("expert_advisors").select("id, code, name, display_name"),
      ]);
      for (const r of [sigRes, delRes, execRes, licRes, eaRes]) if (r.error) throw r.error;

      const deliveries = delRes.data ?? [];
      const executions = execRes.data ?? [];
      const licences = licRes.data ?? [];

      const eaByAny = new Map<string, string>();
      for (const ea of eaRes.data ?? []) {
        const label = (ea.display_name as string) || (ea.name as string) || (ea.code as string) || "Unnamed robot";
        if (ea.id) eaByAny.set(String(ea.id), label);
        if (ea.code) eaByAny.set(String(ea.code), label);
      }

      const delBySignal = new Map<string, number>();
      for (const d of deliveries) {
        const k = String(d.signal_id);
        delBySignal.set(k, (delBySignal.get(k) ?? 0) + 1);
      }
      const isGood = (s: unknown) => s === "filled" || s === "ok" || s === "success";

      const execBySignal = new Map<string, { ok: number; failed: number }>();
      for (const e of executions) {
        const k = String(e.signal_id);
        const row = execBySignal.get(k) ?? { ok: 0, failed: 0 };
        if (isGood(e.status)) row.ok += 1;
        else row.failed += 1;
        execBySignal.set(k, row);
      }

      const rows = (sigRes.data ?? []).map((s) => {
        const ex = execBySignal.get(String(s.id)) ?? { ok: 0, failed: 0 };
        return {
          id: s.id as string,
          robot: s.ea_id ? eaByAny.get(String(s.ea_id)) ?? String(s.ea_id) : null,
          pair: (s.pair as string) ?? null,
          side: ((s.side as string) ?? (s.type as string) ?? "").toUpperCase() || null,
          orderType: (s.order_type as string) ?? null,
          status: (s.status as string) ?? null,
          lot: s.lot === null || s.lot === undefined ? null : num(s.lot),
          createdAt: (s.created_at as string) ?? null,
          delivered: delBySignal.get(String(s.id)) ?? 0,
          executedOk: ex.ok,
          executedFailed: ex.failed,
        };
      });

      const failures = executions
        .filter((e) => !isGood(e.status))
        .slice(0, 60)
        .map((e) => ({
          id: e.id as string,
          signalId: (e.signal_id as string) ?? null,
          licenseId: (e.license_id as string) ?? null,
          status: (e.status as string) ?? null,
          code: (e.code as string) ?? null,
          detail: (e.detail as string) ?? null,
          pair: (e.pair as string) ?? null,
          side: (e.side as string) ?? null,
          executedAt: (e.executed_at as string) ?? null,
        }));

      const optedIn = licences.filter((l) => l.auto_execute).length;

      return json({
        success: true,
        rows,
        failures,
        health: {
          signals: rows.length,
          deliveries: deliveries.length,
          executions: executions.length,
          executionsFailed: failures.length,
          licences: licences.length,
          /**
           * The number that explains an otherwise baffling pipeline: a robot
           * can fan perfectly good signals out to a fleet where nobody has
           * turned auto-execute on, and every one of them is delivered and
           * none of them trade.
           */
          autoExecuteOptedIn: optedIn,
          autoExecuteShare: licences.length ? optedIn / licences.length : 0,
        },
      });
    }

    // ---- directory ---------------------------------------------------------
    if (action === "directory") {
      const { payments } = await loadPayments();
      const real = payments.filter(counts);

      const [profRes, licRes, subRes] = await Promise.all([
        svc
          .from("profiles")
          .select(
            "id, full_name, display_name, phone, approval_status, approved_at, approval_note, license_credits, created_at",
          )
          .order("created_at", { ascending: false }),
        svc.from("licenses").select("id, owner_id, owner_email, status"),
        svc.from("subscriptions").select("email, is_premium, is_lifetime, has_scanner, device_id, created_at"),
      ]);
      for (const r of [profRes, licRes, subRes]) if (r.error) throw r.error;

      // profiles has no email column -- it lives in auth.users, which only the
      // service role can read.
      const { data: authList, error: authListErr } = await svc.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (authListErr) throw authListErr;

      const authById = new Map(
        (authList?.users ?? []).map((u) => [
          u.id,
          {
            email: u.email ?? null,
            emailVerified: Boolean(u.email_confirmed_at),
            lastSignInAt: u.last_sign_in_at ?? null,
          },
        ]),
      );

      const licenceCount = new Map<string, number>();
      for (const l of licRes.data ?? []) {
        if (!l.owner_id) continue;
        const k = String(l.owner_id);
        licenceCount.set(k, (licenceCount.get(k) ?? 0) + 1);
      }

      const mentors = (profRes.data ?? []).map((p) => {
        const auth = authById.get(String(p.id));
        return {
          id: p.id as string,
          email: auth?.email ?? null,
          emailVerified: auth?.emailVerified ?? false,
          lastSignInAt: auth?.lastSignInAt ?? null,
          fullName: (p.full_name as string) ?? null,
          displayName: (p.display_name as string) ?? null,
          phone: (p.phone as string) ?? null,
          approvalStatus: (p.approval_status as string) ?? "pending",
          approvedAt: (p.approved_at as string) ?? null,
          approvalNote: (p.approval_note as string) ?? null,
          licenseCredits: (p.license_credits as number) ?? 0,
          licencesIssued: licenceCount.get(String(p.id)) ?? 0,
          createdAt: (p.created_at as string) ?? null,
        };
      });

      const spendByEmail = new Map<string, number>();
      for (const p of real) {
        if (!p.email) continue;
        spendByEmail.set(p.email, (spendByEmail.get(p.email) ?? 0) + p.gross);
      }

      const appUsers = (subRes.data ?? []).map((s) => {
        const email = String(s.email ?? "").toLowerCase();
        return {
          email,
          isPremium: Boolean(s.is_premium),
          isLifetime: Boolean(s.is_lifetime),
          hasScanner: Boolean(s.has_scanner),
          bound: Boolean(s.device_id),
          createdAt: (s.created_at as string) ?? null,
          spend: spendByEmail.get(email) ?? 0,
        };
      });

      return json({ success: true, mentors, appUsers });
    }

    return json({ success: false, error: "Unknown action." }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin-analytics] " + message);
    return json({ success: false, error: message }, 500);
  }
});
