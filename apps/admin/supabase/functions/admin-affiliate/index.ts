import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * The operator's side of the mentor affiliate programme.
 *
 * Who is selling, which robot is selling, whose agreement is waiting for a
 * signature to be checked, and what has been paid out.
 *
 * AUTH: a signed-in user who appears in `public.admin_users`, on a session that
 * has cleared two-factor. `verify_jwt` is on but that alone is NOT enough --
 * the project's anon key is itself a valid signed JWT and ships inside the
 * mobile app -- so the body calls `auth.getUser()`, checks `admin_users`, and
 * then requires aal2. This function returns every mentor's bank account, so a
 * stolen password on its own must not open it. Same pattern as admin-analytics.
 *
 * The commission arithmetic is NOT repeated here. It lives in
 * `affiliate_license_sales` and the two scoreboard views, which the mentor
 * portal reads as well -- so a mentor and an admin looking at the same month
 * cannot be shown two different numbers.
 */

type Action =
  | "overview"
  | "agreements"
  | "agreement.decide"
  | "agreement.document-url"
  | "mentor"
  | "payout.create"
  | "payout.update"
  | "websites"
  | "website.decide"
  | "settings.update";

interface Body {
  action?: Action;
  mentorId?: string;
  /** agreement.decide / website.decide */
  decision?: string;
  note?: string;
  /** agreement.decide — overrides the programme default for this mentor */
  commissionRate?: number;
  qualifyingTarget?: number;
  /** payout.create */
  periodStart?: string;
  periodEnd?: string;
  amount?: number;
  reference?: string;
  /** payout.update */
  payoutId?: string;
  status?: string;
  /** website.decide */
  websiteId?: string;
  liveUrl?: string;
  /** settings.update */
  settings?: Record<string, unknown>;
}

const num = (v: unknown): number => {
  const n = Number.parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown, max = 500): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/**
 * The assurance level of a token that has ALREADY been verified.
 *
 * `auth.getUser(jwt)` checks the signature against the auth server, so by the
 * time this is called the token is authentic and reading its payload is safe.
 * Never call it on a token that has not been through getUser first.
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
      console.warn("[admin-affiliate] rejected non-admin " + user.id);
      return json({ success: false, error: "Not authorised." }, 403);
    }

    if (assuranceLevel(jwt) !== "aal2") {
      console.warn("[admin-affiliate] refused an aal1 session for " + user.id);
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

    const { data: settings, error: setErr } = await svc
      .from("affiliate_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (setErr) throw setErr;
    if (!settings) throw new Error("The affiliate programme has no settings row.");

    /** Names for a set of mentor ids, from profiles and auth in one go. */
    const nameMentors = async (ids: string[]) => {
      const unique = [...new Set(ids.filter(Boolean))];
      const out = new Map<string, { name: string; email: string | null }>();
      if (unique.length === 0) return out;

      const { data: profiles } = await svc
        .from("profiles")
        .select("id, full_name, display_name")
        .in("id", unique);

      // Emails live in auth.users, which no client may read and no join reaches.
      const emails = new Map<string, string | null>();
      await Promise.all(
        unique.map(async (id) => {
          const { data } = await svc.auth.admin.getUserById(id);
          emails.set(id, data?.user?.email ?? null);
        }),
      );

      for (const id of unique) {
        const p = (profiles ?? []).find((r) => r.id === id);
        out.set(id, {
          name: p?.display_name || p?.full_name || emails.get(id) || "Unnamed mentor",
          email: emails.get(id) ?? null,
        });
      }
      return out;
    };

    // ---- agreement.decide -------------------------------------------------
    if (action === "agreement.decide") {
      const mentorId = body.mentorId;
      const decision = body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : null;
      if (!isUuid(mentorId)) return json({ success: false, error: "Which mentor?" }, 400);
      if (!decision) return json({ success: false, error: "Approve or reject." }, 400);

      const { data: existing, error: exErr } = await svc
        .from("mentor_agreements")
        .select("id, status, commission_option")
        .eq("mentor_id", mentorId)
        .maybeSingle();
      if (exErr) throw exErr;
      if (!existing) return json({ success: false, error: "That mentor has no agreement on file." }, 404);
      if (existing.status === "draft") {
        return json(
          { success: false, error: "That agreement has not been submitted yet." },
          409,
        );
      }

      const option = existing.commission_option === "A" ? "A" : "B";
      // Stamped now, from settings, unless the admin negotiated something else.
      // After this the row carries its own terms and changing the programme
      // cannot rewrite them.
      const rate =
        body.commissionRate != null && num(body.commissionRate) > 0
          ? Math.min(1, num(body.commissionRate))
          : option === "A"
            ? num(settings.option_a_rate)
            : num(settings.option_b_rate);
      const target =
        body.qualifyingTarget != null && num(body.qualifyingTarget) > 0
          ? Math.round(num(body.qualifyingTarget))
          : option === "A"
            ? Number(settings.option_a_target)
            : Number(settings.option_b_target);

      const { error } = await svc
        .from("mentor_agreements")
        .update({
          status: decision,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_note: str(body.note, 1000),
          commission_rate: decision === "approved" ? rate : null,
          qualifying_target: decision === "approved" ? target : null,
        })
        .eq("mentor_id", mentorId);
      if (error) throw error;

      console.log(
        "[admin-affiliate] " + (user.email ?? user.id) + " " + decision + " the agreement for " + mentorId,
      );
      return json({ success: true });
    }

    // ---- agreement.document-url -------------------------------------------
    if (action === "agreement.document-url") {
      const mentorId = body.mentorId;
      if (!isUuid(mentorId)) return json({ success: false, error: "Which mentor?" }, 400);

      const { data: row, error } = await svc
        .from("mentor_agreements")
        .select("document_path")
        .eq("mentor_id", mentorId)
        .maybeSingle();
      if (error) throw error;
      if (!row?.document_path) {
        return json({ success: false, error: "Nothing has been uploaded for that mentor." }, 404);
      }

      const { data: signed, error: signErr } = await svc.storage
        .from("mentor-documents")
        .createSignedUrl(row.document_path, 300);
      if (signErr) throw signErr;

      console.log("[admin-affiliate] " + (user.email ?? user.id) + " opened the agreement for " + mentorId);
      return json({ success: true, url: signed?.signedUrl ?? null });
    }

    // ---- payout.create ----------------------------------------------------
    if (action === "payout.create") {
      const mentorId = body.mentorId;
      if (!isUuid(mentorId)) return json({ success: false, error: "Which mentor?" }, 400);

      const periodStart = str(body.periodStart, 10);
      const periodEnd = str(body.periodEnd, 10);
      if (!periodStart || !periodEnd) {
        return json({ success: false, error: "A payout needs a period." }, 400);
      }
      if (periodEnd < periodStart) {
        return json({ success: false, error: "The period ends before it starts." }, 400);
      }

      // Commission is only ever raised against an approved agreement, at the
      // rate that agreement carries. This is the clause-6 check, in code.
      const { data: agreement } = await svc
        .from("mentor_agreements")
        .select("status, commission_rate")
        .eq("mentor_id", mentorId)
        .maybeSingle();
      if (!agreement || agreement.status !== "approved") {
        return json(
          { success: false, error: "That mentor has no approved agreement, so no commission is due." },
          409,
        );
      }

      // Recount the window from the sales view rather than trusting numbers
      // sent by a browser -- the amount may be overridden, the evidence may not.
      // `period_end` is inclusive to a human and exclusive to a range query, so
      // it is advanced by a day here. Parsed as UTC explicitly: a bare
      // "2026-09-30" is local time in Deno and would shift the window.
      const endExclusive = new Date(new Date(periodEnd + "T00:00:00Z").getTime() + 86400000)
        .toISOString()
        .slice(0, 10);
      const { data: rows, error: rowsErr } = await svc
        .from("affiliate_license_sales")
        .select("gross, qualified, qualified_at")
        .eq("mentor_id", mentorId)
        .eq("qualified", true)
        .gte("qualified_at", periodStart)
        .lt("qualified_at", endExclusive);
      if (rowsErr) throw rowsErr;

      const keys = (rows ?? []).length;
      const gross = (rows ?? []).reduce((t, r) => t + num(r.gross), 0);
      const rate = num(agreement.commission_rate);
      const amount =
        body.amount != null && num(body.amount) > 0
          ? Math.round(num(body.amount) * 100) / 100
          : Math.round(gross * rate * 100) / 100;

      const { error } = await svc.from("mentor_payouts").insert({
        mentor_id: mentorId,
        period_start: periodStart,
        period_end: periodEnd,
        qualifying_keys: keys,
        gross_revenue: gross,
        commission_rate: rate,
        amount,
        reference: str(body.reference, 120),
        note: str(body.note, 1000),
        created_by: user.id,
      });
      if (error) throw error;

      console.log(
        "[admin-affiliate] " + (user.email ?? user.id) + " raised R" + amount + " for " + mentorId,
      );
      return json({ success: true, qualifyingKeys: keys, grossRevenue: gross, amount });
    }

    // ---- payout.update ----------------------------------------------------
    if (action === "payout.update") {
      const id = body.payoutId;
      const status = body.status;
      if (!isUuid(id)) return json({ success: false, error: "Which payout?" }, 400);
      if (!["pending", "paid", "cancelled"].includes(String(status))) {
        return json({ success: false, error: "Unknown payout status." }, 400);
      }

      const { error } = await svc
        .from("mentor_payouts")
        .update({
          status,
          paid_at: status === "paid" ? new Date().toISOString() : null,
          reference: str(body.reference, 120),
        })
        .eq("id", id);
      if (error) throw error;

      console.log("[admin-affiliate] " + (user.email ?? user.id) + " marked payout " + id + " " + status);
      return json({ success: true });
    }

    // ---- website.decide ---------------------------------------------------
    if (action === "website.decide") {
      const id = body.websiteId;
      if (!isUuid(id)) return json({ success: false, error: "Which request?" }, 400);

      const allowed = ["in_review", "approved", "building", "live", "rejected"];
      const status = String(body.decision ?? "");
      if (!allowed.includes(status)) {
        return json({ success: false, error: "Unknown website status." }, 400);
      }

      const { error } = await svc
        .from("mentor_websites")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_note: str(body.note, 1000),
          live_url: status === "live" ? str(body.liveUrl, 300) : null,
          published_at: status === "live" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;

      console.log("[admin-affiliate] " + (user.email ?? user.id) + " set website " + id + " to " + status);
      return json({ success: true });
    }

    // ---- settings.update --------------------------------------------------
    if (action === "settings.update") {
      const s = body.settings ?? {};
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

      const int = (v: unknown) => Math.max(0, Math.round(num(v)));
      const pct = (v: unknown) => {
        const n = num(v);
        // Accept either 0.15 or 15 and store the fraction. Somebody typing "40"
        // into a rate field means 40%, not 4000%.
        const frac = n > 1 ? n / 100 : n;
        return Math.min(1, Math.max(0, Math.round(frac * 10000) / 10000));
      };

      if (s.optionBTarget != null) patch.option_b_target = int(s.optionBTarget);
      if (s.optionBRate != null) patch.option_b_rate = pct(s.optionBRate);
      if (s.optionATarget != null) patch.option_a_target = int(s.optionATarget);
      if (s.optionARate != null) patch.option_a_rate = pct(s.optionARate);
      if (s.websiteThreshold != null) patch.website_threshold = int(s.websiteThreshold);
      if (typeof s.requireScanner === "boolean") patch.require_scanner = s.requireScanner;
      if (s.agreementVersion != null) patch.agreement_version = str(s.agreementVersion, 40);

      const { error } = await svc.from("affiliate_settings").update(patch).eq("id", 1);
      if (error) throw error;

      console.log("[admin-affiliate] " + (user.email ?? user.id) + " changed the programme terms");
      return json({ success: true });
    }

    // ---- agreements -------------------------------------------------------
    if (action === "agreements") {
      const { data, error } = await svc
        .from("mentor_agreements")
        .select("*")
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const names = await nameMentors((data ?? []).map((r) => r.mentor_id as string));
      const { data: scores } = await svc.from("affiliate_mentor_scoreboard").select("*");
      const byMentor = new Map((scores ?? []).map((r) => [r.mentor_id as string, r]));

      return json({
        success: true,
        agreements: (data ?? []).map((r) => {
          const who = names.get(r.mentor_id as string);
          const s = byMentor.get(r.mentor_id as string);
          return {
            mentorId: r.mentor_id,
            mentorName: who?.name ?? "Unnamed mentor",
            mentorEmail: who?.email ?? null,
            status: r.status,
            commissionOption: r.commission_option,
            payoutFrequency: r.payout_frequency,
            fullName: r.full_name,
            phone: r.phone,
            email: r.email,
            // The admin screen is the one place the full account number is
            // shown: somebody has to type it into a banking app.
            bankName: r.bank_name,
            accountHolder: r.account_holder,
            accountNumber: r.account_number,
            accountType: r.account_type,
            branchName: r.branch_name,
            branchCode: r.branch_code,
            documentName: r.document_name,
            hasDocument: Boolean(r.document_path),
            signedOn: r.signed_on,
            agreementVersion: r.agreement_version,
            submittedAt: r.submitted_at,
            reviewedAt: r.reviewed_at,
            reviewNote: r.review_note,
            commissionRate: r.commission_rate == null ? null : num(r.commission_rate),
            qualifyingTarget: r.qualifying_target,
            qualifyingKeys: Number(s?.qualifying_keys ?? 0),
            keysIssued: Number(s?.keys_issued ?? 0),
          };
        }),
        defaults: {
          optionARate: num(settings.option_a_rate),
          optionATarget: Number(settings.option_a_target),
          optionBRate: num(settings.option_b_rate),
          optionBTarget: Number(settings.option_b_target),
        },
      });
    }

    // ---- websites ---------------------------------------------------------
    if (action === "websites") {
      const { data, error } = await svc
        .from("mentor_websites")
        .select("*")
        .neq("status", "draft")
        .order("requested_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const names = await nameMentors((data ?? []).map((r) => r.mentor_id as string));
      const { data: scores } = await svc.from("affiliate_mentor_scoreboard").select("*");
      const byMentor = new Map((scores ?? []).map((r) => [r.mentor_id as string, r]));

      const eaIds = [...new Set((data ?? []).map((r) => r.ea_id).filter(Boolean))] as string[];
      const eas = eaIds.length
        ? (await svc.from("expert_advisors").select("id, name, display_name").in("id", eaIds)).data
        : [];
      const eaName = new Map(
        (eas ?? []).map((e) => [e.id as string, (e.display_name as string) || (e.name as string)]),
      );

      return json({
        success: true,
        websites: (data ?? []).map((r) => {
          const who = names.get(r.mentor_id as string);
          const s = byMentor.get(r.mentor_id as string);
          return {
            id: r.id,
            mentorId: r.mentor_id,
            mentorName: who?.name ?? "Unnamed mentor",
            mentorEmail: who?.email ?? null,
            status: r.status,
            robotName: r.ea_id ? (eaName.get(r.ea_id as string) ?? null) : null,
            subdomain: r.subdomain,
            headline: r.headline,
            tagline: r.tagline,
            about: r.about,
            brokerLinks: r.broker_links ?? [],
            groupLinks: r.group_links ?? [],
            results: r.results ?? [],
            testimonials: r.testimonials ?? [],
            priceZar: r.price_zar == null ? null : num(r.price_zar),
            payoutMethod: r.payout_method,
            payoutDetail: r.payout_detail,
            requestedAt: r.requested_at,
            reviewNote: r.review_note,
            liveUrl: r.live_url,
            // Whether they had actually earned it when they asked.
            qualifyingKeys: Number(s?.qualifying_keys ?? 0),
            threshold: Number(settings.website_threshold),
          };
        }),
      });
    }

    // ---- mentor (one mentor, in full) -------------------------------------
    if (action === "mentor") {
      const mentorId = body.mentorId;
      if (!isUuid(mentorId)) return json({ success: false, error: "Which mentor?" }, 400);

      const [{ data: score }, { data: sales }, { data: payouts }, { data: robots }] =
        await Promise.all([
          svc.from("affiliate_mentor_scoreboard").select("*").eq("mentor_id", mentorId).maybeSingle(),
          svc
            .from("affiliate_license_sales")
            .select(
              "license_key, ea_id, issued_at, app_paid, scanner_paid, buyer_email, gross, qualified, qualified_at",
            )
            .eq("mentor_id", mentorId)
            .eq("qualified", true)
            .order("qualified_at", { ascending: false })
            .limit(500),
          svc.from("mentor_payouts").select("*").eq("mentor_id", mentorId).order("period_start", { ascending: false }),
          svc.from("affiliate_bot_scoreboard").select("*").eq("mentor_id", mentorId),
        ]);

      const names = await nameMentors([mentorId]);
      const who = names.get(mentorId);

      return json({
        success: true,
        mentor: { id: mentorId, name: who?.name ?? "Unnamed mentor", email: who?.email ?? null },
        scoreboard: score ?? null,
        robots: robots ?? [],
        sales: (sales ?? []).map((r) => ({
          licenseKey: r.license_key,
          issuedAt: r.issued_at,
          paidAt: r.qualified_at,
          buyerEmail: r.buyer_email,
          gross: num(r.gross),
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
        })),
      });
    }

    // ---- overview (default) -----------------------------------------------
    const [
      { data: mentorScores, error: msErr },
      { data: botScores, error: bsErr },
      { data: agreements },
      { data: websites },
      { data: payouts },
      { data: unattributed },
    ] = await Promise.all([
      svc.from("affiliate_mentor_scoreboard").select("*"),
      svc.from("affiliate_bot_scoreboard").select("*"),
      svc.from("mentor_agreements").select("mentor_id, status, commission_option, commission_rate, qualifying_target, submitted_at"),
      svc.from("mentor_websites").select("id, mentor_id, status, requested_at"),
      svc.from("mentor_payouts").select("mentor_id, amount, status"),
      svc.from("affiliate_unattributed_payments").select("gross"),
    ]);
    if (msErr) throw msErr;
    if (bsErr) throw bsErr;

    const names = await nameMentors((mentorScores ?? []).map((r) => r.mentor_id as string));
    const agreementBy = new Map((agreements ?? []).map((a) => [a.mentor_id as string, a]));
    const websiteBy = new Map((websites ?? []).map((w) => [w.mentor_id as string, w]));

    const paidBy = new Map<string, number>();
    for (const p of payouts ?? []) {
      if (p.status !== "paid") continue;
      const id = p.mentor_id as string;
      paidBy.set(id, (paidBy.get(id) ?? 0) + num(p.amount));
    }

    const mentors = (mentorScores ?? [])
      .map((s) => {
        const id = s.mentor_id as string;
        const a = agreementBy.get(id);
        const option = (a?.commission_option as string) ?? "B";
        const approved = a?.status === "approved";
        const rate = approved && a?.commission_rate != null
          ? num(a.commission_rate)
          : option === "A"
            ? num(settings.option_a_rate)
            : num(settings.option_b_rate);
        const target = approved && a?.qualifying_target != null
          ? Number(a.qualifying_target)
          : option === "A"
            ? Number(settings.option_a_target)
            : Number(settings.option_b_target);

        const monthKeys = Number(s.qualifying_keys_this_month ?? 0);
        const monthRevenue = num(s.qualifying_revenue_this_month);
        const lifetimeKeys = Number(s.qualifying_keys ?? 0);
        const progress = option === "A" ? lifetimeKeys : monthKeys;

        return {
          mentorId: id,
          name: names.get(id)?.name ?? "Unnamed mentor",
          email: names.get(id)?.email ?? null,
          keysIssued: Number(s.keys_issued ?? 0),
          qualifyingKeys: lifetimeKeys,
          awaitingScanner: Number(s.awaiting_scanner ?? 0),
          qualifyingKeysThisMonth: monthKeys,
          qualifyingRevenue: num(s.qualifying_revenue),
          qualifyingRevenueThisMonth: monthRevenue,
          robots: Number(s.robots ?? 0),
          lastSaleAt: s.last_sale_at ?? null,
          conversionPct:
            Number(s.keys_issued ?? 0) === 0
              ? 0
              : Math.round((lifetimeKeys / Number(s.keys_issued)) * 1000) / 10,
          agreementStatus: (a?.status as string) ?? "none",
          commissionOption: option,
          commissionRate: rate,
          target,
          targetMet: progress >= target,
          // Only an approved agreement that has met its target accrues.
          commissionDue:
            approved && progress >= target
              ? Math.round((option === "A" ? num(s.qualifying_revenue) : monthRevenue) * rate * 100) / 100
              : 0,
          paidOut: paidBy.get(id) ?? 0,
          websiteStatus: (websiteBy.get(id)?.status as string) ?? "none",
          websiteEligible: lifetimeKeys >= Number(settings.website_threshold),
        };
      })
      .sort((a, b) => b.qualifyingKeys - a.qualifyingKeys || b.keysIssued - a.keysIssued);

    const robots = (botScores ?? [])
      .map((r) => ({
        eaId: r.ea_id,
        name: r.robot_name,
        code: r.robot_code,
        mentorId: r.mentor_id,
        mentorName: names.get(r.mentor_id as string)?.name ?? null,
        keysIssued: Number(r.keys_issued ?? 0),
        qualifyingKeys: Number(r.qualifying_keys ?? 0),
        qualifyingRevenue: num(r.qualifying_revenue),
        conversionPct: num(r.conversion_pct),
        lastSaleAt: r.last_sale_at ?? null,
      }))
      .sort((a, b) => b.qualifyingKeys - a.qualifyingKeys || b.keysIssued - a.keysIssued);

    const unattributedTotal = (unattributed ?? []).reduce((t, r) => t + num(r.gross), 0);

    return json({
      success: true,
      settings: {
        optionATarget: Number(settings.option_a_target),
        optionARate: num(settings.option_a_rate),
        optionBTarget: Number(settings.option_b_target),
        optionBRate: num(settings.option_b_rate),
        websiteThreshold: Number(settings.website_threshold),
        requireScanner: settings.require_scanner,
        agreementVersion: settings.agreement_version,
      },
      totals: {
        mentors: mentors.length,
        qualifyingKeys: mentors.reduce((t, m) => t + m.qualifyingKeys, 0),
        qualifyingRevenue: mentors.reduce((t, m) => t + m.qualifyingRevenue, 0),
        commissionDue: mentors.reduce((t, m) => t + m.commissionDue, 0),
        paidOut: mentors.reduce((t, m) => t + m.paidOut, 0),
        agreementsPending: (agreements ?? []).filter((a) => a.status === "submitted").length,
        websitesPending: (websites ?? []).filter((w) => w.status === "requested").length,
        // Real money that arrived with no licence key on it, so no mentor can
        // be credited. Shown so the gap is visible rather than mysterious.
        unattributedRevenue: unattributedTotal,
        unattributedPayments: (unattributed ?? []).length,
      },
      mentors,
      robots,
    });
  } catch (err) {
    console.error("[admin-affiliate]", err);
    return json(
      { success: false, error: "The affiliate figures could not be loaded. Please try again." },
      500,
    );
  }
});
