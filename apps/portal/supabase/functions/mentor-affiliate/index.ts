import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * The mentor's own side of the affiliate programme.
 *
 * Everything a mentor can see or change about their commission: the scoreboard,
 * the signed agreement, and the free-website request.
 *
 * AUTH: a signed-in user whose `profiles.approval_status` is 'approved'.
 * `verify_jwt` is on but that is NOT enough on its own -- the project's anon key
 * is itself a valid signed JWT and ships inside the mobile app -- so the body
 * calls `auth.getUser()` and then re-checks approval. Same shape as the other
 * mentor functions.
 *
 * It runs on the SERVICE ROLE, because the commission views read `itn_logs`,
 * which no mentor may ever select from. Every query below is therefore
 * explicitly filtered to `user.id`. There is no action that takes a mentor id
 * as a parameter, and there must never be one: with the service role behind it,
 * such a parameter would let any approved mentor read any other mentor's
 * earnings and bank details.
 *
 * The signed agreement itself is NOT uploaded through here. The browser puts it
 * straight into the private `mentor-documents` bucket under its own uid prefix,
 * using its own session, and then calls `agreement.save` with the path. Storage
 * policy is the authorisation; a file never transits this function.
 */

type Action =
  | "summary"
  | "agreement.save"
  | "agreement.document-url"
  | "website.save";

interface Body {
  action?: Action;
  /** agreement.save */
  agreement?: Record<string, unknown>;
  /** website.save */
  website?: Record<string, unknown>;
  /** Whether this save is the final submission or just a draft. */
  submit?: boolean;
}

const str = (v: unknown, max = 500): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

const num = (v: unknown): number => {
  const n = Number.parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

/**
 * A bank account number is returned to its own owner as the last four digits
 * only. They typed it, so they do not need it read back; anyone looking over
 * their shoulder does.
 */
const maskAccount = (v: string | null): string | null => {
  if (!v) return null;
  const digits = v.replace(/\s+/g, "");
  if (digits.length <= 4) return "••••";
  return "••••" + digits.slice(-4);
};

/** Month boundaries in UTC, matching `date_trunc('month', now())` in the views. */
function monthWindow(): { start: string; end: string; label: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: start.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
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

    const { data: profile, error: profileErr } = await svc
      .from("profiles")
      .select("approval_status, full_name, display_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile || profile.approval_status !== "approved") {
      return json(
        { success: false, error: "Your mentor account is not approved yet." },
        403,
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const action: Action = body.action ?? "summary";

    const { data: settings, error: settingsErr } = await svc
      .from("affiliate_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (settingsErr) throw settingsErr;
    if (!settings) throw new Error("The affiliate programme has no settings row.");

    // ---- agreement.document-url -------------------------------------------
    // A short-lived signed URL for the mentor's own upload. The bucket is
    // private and stays private; this is the only way the file is ever read.
    if (action === "agreement.document-url") {
      const { data: row, error } = await svc
        .from("mentor_agreements")
        .select("document_path")
        .eq("mentor_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!row?.document_path) {
        return json({ success: false, error: "No agreement has been uploaded yet." }, 404);
      }
      // Belt and braces: the storage policy already scopes reads to the
      // caller's own prefix, but this function holds the service role, so the
      // prefix is re-checked here rather than trusted from the column.
      if (!row.document_path.startsWith(user.id + "/")) {
        console.warn("[mentor-affiliate] refused a cross-tenant document path for " + user.id);
        return json({ success: false, error: "Not authorised." }, 403);
      }
      const { data: signed, error: signErr } = await svc.storage
        .from("mentor-documents")
        .createSignedUrl(row.document_path, 300);
      if (signErr) throw signErr;
      return json({ success: true, url: signed?.signedUrl ?? null });
    }

    // ---- agreement.save ---------------------------------------------------
    if (action === "agreement.save") {
      const a = body.agreement ?? {};
      const submit = body.submit === true;

      const { data: existing, error: exErr } = await svc
        .from("mentor_agreements")
        .select("id, status, document_path, document_name, document_size, account_number")
        .eq("mentor_id", user.id)
        .maybeSingle();
      if (exErr) throw exErr;

      // An approved agreement is settled. Changing the banking details or the
      // commission option after the fact would rewrite terms both sides signed,
      // so it goes back through an admin.
      if (existing && existing.status === "approved") {
        return json(
          {
            success: false,
            error:
              "Your agreement is already approved. Contact support to change your banking details or commission option.",
          },
          409,
        );
      }
      if (existing && existing.status === "submitted") {
        return json(
          { success: false, error: "Your agreement is already with us for review." },
          409,
        );
      }

      const documentPath = str(a.documentPath, 400);
      if (documentPath && !documentPath.startsWith(user.id + "/")) {
        return json({ success: false, error: "Not authorised." }, 403);
      }

      const option = a.commissionOption === "A" ? "A" : a.commissionOption === "B" ? "B" : null;
      const frequency =
        a.payoutFrequency === "weekly" ? "weekly" : a.payoutFrequency === "monthly" ? "monthly" : null;
      const accountType = ["cheque", "savings", "other"].includes(String(a.accountType))
        ? String(a.accountType)
        : null;

      // The account number is only ever returned to the browser masked, so the
      // form cannot send it back. An absent value therefore means "leave it
      // alone" -- which is what the field's own hint promises -- and only a
      // retyped one replaces what is stored. Writing str(undefined) straight
      // into the column would silently wipe the mentor's banking details every
      // time they saved a draft.
      const accountNumber = str(a.accountNumber, 40) ?? existing?.account_number ?? null;

      const payload: Record<string, unknown> = {
        mentor_id: user.id,
        commission_option: option,
        payout_frequency: frequency,
        full_name: str(a.fullName, 200),
        phone: str(a.phone, 40),
        email: str(a.email, 200)?.toLowerCase() ?? null,
        bank_name: str(a.bankName, 120),
        account_holder: str(a.accountHolder, 200),
        account_number: accountNumber,
        account_type: accountType,
        branch_name: str(a.branchName, 120),
        branch_code: str(a.branchCode, 20),
        // Same rule as the account number: absent means "keep what is there".
        document_path: documentPath ?? existing?.document_path ?? null,
        document_name: str(a.documentName, 260) ?? existing?.document_name ?? null,
        document_size:
          Math.max(0, Math.round(num(a.documentSize))) || existing?.document_size || null,
        signed_on: str(a.signedOn, 10),
        agreement_version: settings.agreement_version,
        status: submit ? "submitted" : "draft",
        submitted_at: submit ? new Date().toISOString() : null,
      };

      if (submit) {
        // What an admin needs in order to be able to say yes. A draft may be as
        // incomplete as the mentor likes; a submission may not, because the
        // review queue is not the place to discover a missing bank account.
        const required: Array<[string, unknown]> = [
          ["your full name", payload.full_name],
          ["a contact number", payload.phone],
          ["an email address", payload.email],
          ["a commission option", payload.commission_option],
          ["your bank name", payload.bank_name],
          ["the account holder's name", payload.account_holder],
          ["your account number", payload.account_number],
          ["your branch code", payload.branch_code],
          ["the signed agreement", payload.document_path],
        ];
        const missing = required.filter(([, v]) => !v).map(([label]) => label);
        if (missing.length > 0) {
          return json(
            {
              success: false,
              error:
                "Before this can go for review we still need " +
                (missing.length === 1
                  ? missing[0]
                  : missing.slice(0, -1).join(", ") + " and " + missing[missing.length - 1]) +
                ".",
            },
            400,
          );
        }
      }

      // `onConflict: mentor_id` rather than a read-then-branch: the column is
      // unique, so two tabs submitting at once resolve to one row instead of
      // one of them failing on the constraint.
      const { error: upErr } = await svc
        .from("mentor_agreements")
        .upsert(payload, { onConflict: "mentor_id" });
      if (upErr) throw upErr;

      console.log(
        "[mentor-affiliate] " + user.id + (submit ? " submitted" : " saved a draft of") + " an agreement",
      );
      return json({ success: true, status: payload.status });
    }

    // ---- website.save -----------------------------------------------------
    if (action === "website.save") {
      const w = body.website ?? {};
      const submit = body.submit === true;

      const { data: score } = await svc
        .from("affiliate_mentor_scoreboard")
        .select("qualifying_keys")
        .eq("mentor_id", user.id)
        .maybeSingle();
      const qualifying = Number(score?.qualifying_keys ?? 0);

      // The reward is earned, not requested. A draft can be filled in at any
      // time -- a mentor building toward the threshold should be able to
      // prepare -- but it cannot be sent until the keys are actually sold.
      if (submit && qualifying < settings.website_threshold) {
        return json(
          {
            success: false,
            error:
              "The free website unlocks at " +
              settings.website_threshold +
              " qualifying keys. You have " +
              qualifying +
              ".",
          },
          403,
        );
      }

      const { data: existing, error: exErr } = await svc
        .from("mentor_websites")
        .select("id, status")
        .eq("mentor_id", user.id)
        .maybeSingle();
      if (exErr) throw exErr;

      if (existing && ["in_review", "approved", "building", "live"].includes(existing.status)) {
        return json(
          { success: false, error: "Your website request is already being worked on." },
          409,
        );
      }

      /** A list of link objects, cleaned of anything that is not a real link. */
      const links = (v: unknown, fields: string[]): unknown[] => {
        if (!Array.isArray(v)) return [];
        return v
          .slice(0, 20)
          .map((raw) => {
            const item = (raw ?? {}) as Record<string, unknown>;
            const out: Record<string, string> = {};
            for (const f of fields) {
              const val = str(item[f], 300);
              if (val) out[f] = val;
            }
            return out;
          })
          .filter((o) => Object.keys(o).length > 0);
      };

      const subdomain = str(w.subdomain, 32)?.toLowerCase() ?? null;
      if (subdomain && !/^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$/.test(subdomain)) {
        return json(
          {
            success: false,
            error:
              "An address may use lowercase letters, numbers and hyphens only, and must start and end with a letter or number.",
          },
          400,
        );
      }

      const payload: Record<string, unknown> = {
        mentor_id: user.id,
        ea_id: str(w.eaId, 40),
        subdomain,
        headline: str(w.headline, 120),
        tagline: str(w.tagline, 200),
        about: str(w.about, 4000),
        accent_color: str(w.accentColor, 9),
        broker_links: links(w.brokerLinks, ["label", "url", "note"]),
        group_links: links(w.groupLinks, ["platform", "label", "url"]),
        results: links(w.results, ["caption", "path", "posted_on"]),
        testimonials: links(w.testimonials, ["name", "handle", "quote"]),
        price_zar: num(w.priceZar) > 0 ? num(w.priceZar) : null,
        payout_method: str(w.payoutMethod, 60),
        payout_detail: str(w.payoutDetail, 300),
        status: submit ? "requested" : "draft",
        requested_at: submit ? new Date().toISOString() : null,
      };

      if (submit) {
        const required: Array<[string, unknown]> = [
          ["which robot the site sells", payload.ea_id],
          ["a web address", payload.subdomain],
          ["a headline", payload.headline],
          ["at least one broker link", (payload.broker_links as unknown[]).length > 0 || null],
          ["how you want to be paid", payload.payout_method],
        ];
        const missing = required.filter(([, v]) => !v).map(([label]) => label);
        if (missing.length > 0) {
          return json(
            {
              success: false,
              error:
                "Before this can go for review we still need " +
                (missing.length === 1
                  ? missing[0]
                  : missing.slice(0, -1).join(", ") + " and " + missing[missing.length - 1]) +
                ".",
            },
            400,
          );
        }
      }

      const { error: upErr } = await svc
        .from("mentor_websites")
        .upsert(payload, { onConflict: "mentor_id" });
      if (upErr) {
        // The one failure worth naming: somebody else took the address.
        if (String(upErr.message ?? "").includes("mentor_websites_subdomain_key")) {
          return json(
            { success: false, error: "That web address is taken. Try another." },
            409,
          );
        }
        throw upErr;
      }

      console.log(
        "[mentor-affiliate] " + user.id + (submit ? " requested" : " saved a draft of") + " a website",
      );
      return json({ success: true, status: payload.status });
    }

    // ---- summary (default) ------------------------------------------------
    const month = monthWindow();

    const [
      { data: score },
      { data: agreement, error: agErr },
      { data: website, error: wsErr },
      { data: sales, error: salesErr },
      { data: payouts, error: poErr },
      { data: robots },
    ] = await Promise.all([
      svc.from("affiliate_mentor_scoreboard").select("*").eq("mentor_id", user.id).maybeSingle(),
      svc.from("mentor_agreements").select("*").eq("mentor_id", user.id).maybeSingle(),
      svc.from("mentor_websites").select("*").eq("mentor_id", user.id).maybeSingle(),
      svc
        .from("affiliate_license_sales")
        .select(
          "license_id, license_key, ea_id, issued_at, app_paid, scanner_paid, app_paid_at, scanner_paid_at, buyer_email, gross, qualified, qualified_at",
        )
        .eq("mentor_id", user.id)
        .order("issued_at", { ascending: false })
        .limit(500),
      svc
        .from("mentor_payouts")
        .select("*")
        .eq("mentor_id", user.id)
        .order("period_start", { ascending: false }),
      svc.from("affiliate_bot_scoreboard").select("*").eq("mentor_id", user.id),
    ]);
    if (agErr) throw agErr;
    if (wsErr) throw wsErr;
    if (salesErr) throw salesErr;
    if (poErr) throw poErr;

    const approved = agreement?.status === "approved";

    // The rate that applies to this mentor. An approved agreement carries the
    // rate stamped at approval; anyone else is shown the programme's current
    // rate for the option they picked, clearly labelled as not yet in force.
    const option = (agreement?.commission_option as string | null) ?? "B";
    const programmeRate =
      option === "A" ? Number(settings.option_a_rate) : Number(settings.option_b_rate);
    const rate = approved && agreement?.commission_rate != null
      ? Number(agreement.commission_rate)
      : programmeRate;
    const target =
      approved && agreement?.qualifying_target != null
        ? Number(agreement.qualifying_target)
        : option === "A"
          ? Number(settings.option_a_target)
          : Number(settings.option_b_target);

    const s = (score ?? {}) as Record<string, unknown>;
    const qualifying = Number(s.qualifying_keys ?? 0);
    const monthQualifying = Number(s.qualifying_keys_this_month ?? 0);
    const monthRevenue = Number(s.qualifying_revenue_this_month ?? 0);
    const lifetimeRevenue = Number(s.qualifying_revenue ?? 0);

    // Option A counts toward a lifetime target; Option B resets every month.
    const progressCount = option === "A" ? qualifying : monthQualifying;
    const targetMet = progressCount >= target;

    const paidOut = (payouts ?? [])
      .filter((p) => p.status === "paid")
      .reduce((t, p) => t + num(p.amount), 0);

    // Earned is only ever quoted once the target is met and the agreement is
    // approved. Showing a commission figure to somebody who has not met either
    // is how a platform ends up arguing about money it never owed.
    const earnedThisMonth = approved && targetMet && option === "B" ? monthRevenue * rate : 0;
    const earnedLifetime = approved && option === "A" && targetMet ? lifetimeRevenue * rate : 0;

    return json({
      success: true,
      mentor: {
        id: user.id,
        name: profile.display_name || profile.full_name || user.email,
        email: user.email,
      },
      programme: {
        option,
        optionLabel: option === "A" ? "Giveaway & target" : "Direct sales",
        rate,
        rateInForce: approved,
        target,
        payoutFrequency: agreement?.payout_frequency ?? null,
        requireScanner: settings.require_scanner,
        websiteThreshold: Number(settings.website_threshold),
        agreementVersion: settings.agreement_version,
        currency: "ZAR",
      },
      month: { label: month.label, start: month.start, end: month.end },
      scoreboard: {
        keysIssued: Number(s.keys_issued ?? 0),
        appPaidKeys: Number(s.app_paid_keys ?? 0),
        scannerPaidKeys: Number(s.scanner_paid_keys ?? 0),
        qualifyingKeys: qualifying,
        awaitingScanner: Number(s.awaiting_scanner ?? 0),
        qualifyingKeysThisMonth: monthQualifying,
        qualifyingRevenueThisMonth: monthRevenue,
        qualifyingRevenue: lifetimeRevenue,
        grossRevenue: Number(s.gross_revenue ?? 0),
        robots: Number(s.robots ?? 0),
        lastSaleAt: s.last_sale_at ?? null,
        progressCount,
        targetMet,
        earnedThisMonth,
        earnedLifetime,
        paidOut,
      },
      agreement: agreement
        ? {
            status: agreement.status,
            commissionOption: agreement.commission_option,
            payoutFrequency: agreement.payout_frequency,
            fullName: agreement.full_name,
            phone: agreement.phone,
            email: agreement.email,
            bankName: agreement.bank_name,
            accountHolder: agreement.account_holder,
            accountNumberMasked: maskAccount(agreement.account_number),
            accountType: agreement.account_type,
            branchName: agreement.branch_name,
            branchCode: agreement.branch_code,
            documentName: agreement.document_name,
            documentSize: agreement.document_size,
            hasDocument: Boolean(agreement.document_path),
            signedOn: agreement.signed_on,
            agreementVersion: agreement.agreement_version,
            submittedAt: agreement.submitted_at,
            reviewedAt: agreement.reviewed_at,
            reviewNote: agreement.review_note,
            // True when the mentor signed an older revision than the one on
            // offer now, so the UI can ask for a fresh signature.
            outdated:
              Boolean(agreement.agreement_version) &&
              agreement.agreement_version !== settings.agreement_version,
          }
        : null,
      website: website
        ? {
            status: website.status,
            eaId: website.ea_id,
            subdomain: website.subdomain,
            headline: website.headline,
            tagline: website.tagline,
            about: website.about,
            accentColor: website.accent_color,
            brokerLinks: website.broker_links ?? [],
            groupLinks: website.group_links ?? [],
            results: website.results ?? [],
            testimonials: website.testimonials ?? [],
            priceZar: website.price_zar,
            payoutMethod: website.payout_method,
            payoutDetail: website.payout_detail,
            requestedAt: website.requested_at,
            reviewNote: website.review_note,
            liveUrl: website.live_url,
          }
        : null,
      robots: (robots ?? []).map((r) => ({
        eaId: r.ea_id,
        name: r.robot_name,
        keysIssued: Number(r.keys_issued ?? 0),
        qualifyingKeys: Number(r.qualifying_keys ?? 0),
        qualifyingRevenue: Number(r.qualifying_revenue ?? 0),
        conversionPct: Number(r.conversion_pct ?? 0),
        lastSaleAt: r.last_sale_at ?? null,
      })),
      sales: (sales ?? []).map((row) => ({
        licenseId: row.license_id,
        licenseKey: row.license_key,
        eaId: row.ea_id,
        issuedAt: row.issued_at,
        appPaid: row.app_paid,
        scannerPaid: row.scanner_paid,
        paidAt: row.qualified_at ?? row.app_paid_at ?? null,
        // The buyer's email is the mentor's own customer, so they may see it.
        buyerEmail: row.buyer_email,
        gross: num(row.gross),
        qualified: row.qualified,
      })),
      payouts: (payouts ?? []).map((p) => ({
        id: p.id,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        qualifyingKeys: Number(p.qualifying_keys ?? 0),
        grossRevenue: num(p.gross_revenue),
        commissionRate: num(p.commission_rate),
        amount: num(p.amount),
        status: p.status,
        paidAt: p.paid_at,
        reference: p.reference,
        note: p.note,
      })),
    });
  } catch (err) {
    // A raw stack trace on a commission screen reads as "your money is broken".
    console.error("[mentor-affiliate]", err);
    return json(
      {
        success: false,
        error: "We could not load your commission figures. Please try again in a moment.",
      },
      500,
    );
  }
});
