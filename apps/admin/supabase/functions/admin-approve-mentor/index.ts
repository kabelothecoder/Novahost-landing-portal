import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Admin-only. Lists mentor signups awaiting review and records the decision.
 *
 * Every new signup lands in `profiles.approval_status = 'pending'` (the column
 * default) and stays locked out of the portal until an admin approves it here.
 *
 * It writes with the SERVICE ROLE for two reasons: the email and the signup
 * metadata live in `auth.users`, which no browser client may read, and the
 * `protect_approval_status` trigger on `profiles` refuses any approval change
 * from a non-admin JWT -- the service role passes because `auth.uid()` is null
 * for it.
 *
 * AUTH: a signed-in user who appears in public.admin_users, on a session that
 * has cleared two-factor. `verify_jwt` is on, but that alone is NOT enough
 * here -- the project's anon key is itself a valid signed JWT and ships inside
 * the APK -- so the body calls `auth.getUser()`, checks `admin_users`, and then
 * requires aal2. Same pattern as admin-grant-access.
 */

type Body = {
  action?: 'list' | 'approve' | 'reject' | 'quota.set' | 'requests.list' | 'request.decide' | 'notify-approved'
  userId?: string
  note?: string
  /** quota.set, and optionally approve: null means unlimited. */
  quota?: number | null
  requestId?: string
  decision?: 'approved' | 'declined'
  /** How many to actually grant on approval. Defaults to what was asked. */
  granted?: number
}

type KeyRequestRow = {
  id: string
  mentorId: string
  mentorName: string | null
  mentorEmail: string | null
  requested: number
  reason: string | null
  status: string
  granted: number | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
}

type MentorRow = {
  id: string
  email: string | null
  fullName: string | null
  displayName: string | null
  phone: string | null
  approvalStatus: string
  approvalNote: string | null
  approvedAt: string | null
  createdAt: string | null
  emailVerified: boolean
  // Vetting links the mentor supplied at signup. These are the whole point of
  // the review -- an admin decides on the strength of these, not the name.
  instagram: string | null
  tiktok: string | null
  telegram: string | null
  whatsapp: string | null
}

// The Safe Browsing flag on novahost-portal.com (see project memory) has
// cleared, so this links to the real brand domain rather than the .vercel.app
// fallback. If it ever gets flagged again, switch back to
// https://novahost-portal.vercel.app rather than a novahost-ea.app subdomain
// -- Safe Browsing can apply at domain scope, and that would take the
// installed iOS PWA origin down with it.
const PORTAL_URL = 'https://novahost-portal.com'

function decisionEmailHtml(status: 'approved' | 'rejected', note: string | null): string {
  const isApproved = status === 'approved'
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#07070E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F2F4F8;">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:17px;font-weight:700;letter-spacing:-0.02em;color:#F2F4F8;">NovaHost</div>
      </div>
      <div style="background-color:#0E1015;border:1px solid #1D2029;border-radius:16px;padding:36px;text-align:center;">
        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#FFFFFF;">
          ${isApproved ? 'Your mentor portal is approved' : 'Your mentor application was not approved'}
        </h1>
        <p style="margin:0;font-size:14.5px;line-height:1.6;color:#98A0B0;">
          ${isApproved
            ? 'Sign in to register your robot, generate license keys for your students, and request more keys any time your quota runs low.'
            : 'You can still sign in, but the portal stays locked until this is resolved.'}
        </p>
        ${note ? `<p style="margin:20px 0 0 0;padding:14px;background:#14171E;border:1px solid #23262F;border-radius:10px;font-size:13.5px;color:#A9B0BF;text-align:left;">${note}</p>` : ''}
        ${isApproved ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px auto 0 auto;">
          <tr>
            <td style="background-color:#A855F7;background-image:linear-gradient(100deg,#F0439E 0%,#A855F7 48%,#22C9E8 100%);border-radius:999px;">
              <a href="${PORTAL_URL}" style="display:inline-block;padding:14px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#07070E;text-decoration:none;">
                Sign in to the portal
              </a>
            </td>
          </tr>
        </table>
        ` : ''}
      </div>
      <div style="text-align:center;margin-top:28px;font-size:11.5px;color:#454B58;">
        &copy; ${new Date().getFullYear()} NovaHost
      </div>
    </div>
  </body>
  </html>`
}

/**
 * Tells a mentor their decision landed, one way or the other.
 *
 * Never allowed to fail the approval itself -- a mentor being approved but not
 * emailed about it is a papercut; an approval that silently fails because
 * Resend rejected the send would be a much worse one. Returns whether it
 * actually went out, so the caller can say so honestly rather than promising
 * an email that never left.
 */
async function sendDecisionEmail(email: string, status: 'approved' | 'rejected', note: string | null): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM')
  if (!apiKey || !from) {
    console.warn('[admin-approve-mentor] Resend is not configured -- decision email not sent')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [email],
        subject: status === 'approved' ? 'Your NovaHost mentor portal is approved' : 'Your NovaHost mentor application',
        html: decisionEmailHtml(status, note),
      }),
    })
    if (!res.ok) {
      console.error('[admin-approve-mentor] Resend rejected the decision email', await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('[admin-approve-mentor] Failed to send decision email', err)
    return false
  }
}

/**
 * The assurance level of a token that has ALREADY been verified.
 *
 * `auth.getUser(jwt)` checks the signature against the auth server, so by the
 * time this is called the token is authentic and reading its payload is safe.
 * Never call it on a token that has not been through getUser first.
 *
 * 'aal1' means the caller knew a password. 'aal2' means they also proved
 * possession of an enrolled authenticator. Approving a mentor hands somebody
 * the ability to send trades to other people's broker accounts, so a stolen
 * password on its own must not be able to do it.
 */
function assuranceLevel (jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1]
    if (!payload) return null
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes))
    return typeof claims.aal === 'string' ? claims.aal : null
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })

  try {
    const svc = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // ---- Who is asking ----------------------------------------------------
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!jwt) return json({ success: false, error: 'Not authorised.' }, 401)

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )
    const { data: { user }, error: authErr } = await authClient.auth.getUser(jwt)
    if (authErr || !user) {
      // Handing the anon key here returns no user -- that is the point.
      return json({ success: false, error: 'Not authorised.' }, 401)
    }

    const { data: admin, error: adminErr } = await svc
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (adminErr) throw adminErr
    if (!admin) {
      console.warn('[admin-approve-mentor] rejected non-admin ' + user.id)
      return json({ success: false, error: 'Not authorised.' }, 403)
    }

    // Knowing the password is not enough to open this.
    if (assuranceLevel(jwt) !== 'aal2') {
      console.warn('[admin-approve-mentor] refused an aal1 session for ' + user.id)
      return json({
        success: false,
        error: 'Two-factor authentication is required for the admin console.',
        code: 'mfa_required',
      }, 403)
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const action = body.action ?? 'list'

    // ---- list -------------------------------------------------------------
    if (action === 'list') {
      const { data: profiles, error: profErr } = await svc
        .from('profiles')
        .select('id, full_name, display_name, phone, approval_status, approval_note, approved_at, created_at')
        .order('created_at', { ascending: false })
      if (profErr) throw profErr

      // One call rather than getUserById per row. The mentor list is in the
      // dozens; revisit the paging if it ever reaches four figures.
      const { data: userList, error: listErr } = await svc.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      if (listErr) throw listErr

      const byId = new Map(userList.users.map((u) => [u.id, u]))

      const rows: MentorRow[] = (profiles ?? []).map((p) => {
        const authUser = byId.get(p.id)
        const meta = (authUser?.user_metadata ?? {}) as Record<string, unknown>
        const str = (k: string) => {
          const v = meta[k]
          return typeof v === 'string' && v.trim() ? v.trim() : null
        }

        return {
          id: p.id,
          email: authUser?.email ?? null,
          fullName: p.full_name,
          displayName: p.display_name,
          phone: p.phone ?? str('phone'),
          approvalStatus: p.approval_status,
          approvalNote: p.approval_note,
          approvedAt: p.approved_at,
          createdAt: p.created_at,
          emailVerified: Boolean(authUser?.email_confirmed_at),
          instagram: str('instagramLink'),
          tiktok: str('tiktokLink'),
          telegram: str('telegramGroupLink'),
          whatsapp: str('whatsappGroupLink'),
        }
      })

      return json({ success: true, rows })
    }

    // ---- approve / reject -------------------------------------------------
    if (action === 'approve' || action === 'reject') {
      const targetId = (body.userId ?? '').trim()
      if (!targetId) return json({ success: false, error: 'Which mentor?' }, 400)

      // An admin demoting themselves would lock the whole queue: they would be
      // bounced to the pending screen and nobody could undo it from the portal.
      if (targetId === user.id && action === 'reject') {
        return json({ success: false, error: 'You cannot reject your own account.' }, 400)
      }

      const status = action === 'approve' ? 'approved' : 'rejected'

      // Approving can set a starting quota in the same click -- optional, so
      // a plain approve (no quota field sent) leaves whatever is already
      // there untouched instead of overwriting it with a default.
      const updatePayload: Record<string, unknown> = {
        approval_status: status,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        approval_note: body.note?.trim() || null,
      }
      if (action === 'approve' && (typeof body.quota === 'number' || body.quota === null)) {
        updatePayload.license_quota = body.quota
      }

      const { data: updated, error: updErr } = await svc
        .from('profiles')
        .update(updatePayload)
        .eq('id', targetId)
        .select('id, approval_status, license_quota')
        .maybeSingle()
      if (updErr) throw updErr
      if (!updated) return json({ success: false, error: 'No such mentor.' }, 404)

      // Register.tsx tells every new signup "we'll email you when it's live" --
      // this is that email. A mentor's own auth record has to be fetched fresh
      // here; the `list` action's bulk fetch is not available inside a single
      // approve/reject call.
      let emailed = false
      const { data: authUser } = await svc.auth.admin.getUserById(targetId)
      if (authUser?.user?.email) {
        emailed = await sendDecisionEmail(authUser.user.email, status, body.note?.trim() || null)
      }

      console.log(`[admin-approve-mentor] ${user.email ?? user.id} set ${targetId} -> ${status} (emailed=${emailed})`)
      return json({
        success: true,
        userId: updated.id,
        approvalStatus: updated.approval_status,
        quota: updated.license_quota,
        emailed,
      })
    }

    // ---- notify-approved ------------------------------------------------------
    // A one-time (or re-runnable) backfill: emails every CURRENTLY approved
    // mentor the same "you're in, sign in, generate keys" message that
    // approve/reject now sends going forward. Needed because that email did
    // not exist yet when most of today's mentors were approved -- Register.tsx
    // promised it, and until this action ran, nobody had actually received it.
    if (action === 'notify-approved') {
      const { data: approvedProfiles, error: profErr } = await svc
        .from('profiles')
        .select('id')
        .eq('approval_status', 'approved')
      if (profErr) throw profErr

      const { data: userList, error: listErr } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listErr) throw listErr
      const emailById = new Map(userList.users.map((u) => [u.id, u.email ?? null]))

      // Sequential, not Promise.all: 18 mentors today, but a burst of
      // simultaneous sends is exactly the shape of thing that trips a
      // provider's rate limit, and this only runs when an admin clicks it.
      let notified = 0
      let skipped = 0
      for (const p of approvedProfiles ?? []) {
        const email = emailById.get(p.id)
        if (!email) { skipped += 1; continue }
        const ok = await sendDecisionEmail(email, 'approved', null)
        if (ok) notified += 1
        else skipped += 1
      }

      const total = (approvedProfiles ?? []).length
      console.log(`[admin-approve-mentor] ${user.email ?? user.id} notified ${notified}/${total} approved mentors`)
      return json({ success: true, total, notified, skipped })
    }

    // ---- quota.set ----------------------------------------------------------
    // Change how many keys a mentor may hold, independent of approval.
    if (action === 'quota.set') {
      const targetId = (body.userId ?? '').trim()
      if (!targetId) return json({ success: false, error: 'Which mentor?' }, 400)
      if (!(typeof body.quota === 'number' && body.quota >= 0) && body.quota !== null) {
        return json({ success: false, error: 'Quota must be a non-negative number, or null for unlimited.' }, 400)
      }

      const { data: updated, error: updErr } = await svc
        .from('profiles')
        .update({ license_quota: body.quota })
        .eq('id', targetId)
        .select('id, license_quota')
        .maybeSingle()
      if (updErr) throw updErr
      if (!updated) return json({ success: false, error: 'No such mentor.' }, 404)

      console.log(`[admin-approve-mentor] ${user.email ?? user.id} set ${targetId} quota -> ${body.quota ?? 'unlimited'}`)
      return json({ success: true, userId: updated.id, quota: updated.license_quota })
    }

    // ---- requests.list --------------------------------------------------------
    if (action === 'requests.list') {
      const { data: requests, error: reqErr } = await svc
        .from('license_key_requests')
        .select('id, mentor_id, requested, reason, status, granted, decided_at, decision_note, created_at')
        // Pending first so the queue reads as a to-do list, not a log.
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
      if (reqErr) throw reqErr

      const mentorIds = Array.from(new Set((requests ?? []).map((r) => r.mentor_id)))
      const { data: profiles, error: profErr } = mentorIds.length
        ? await svc.from('profiles').select('id, full_name, display_name').in('id', mentorIds)
        : { data: [], error: null }
      if (profErr) throw profErr
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

      // Same one-call pattern as `list`: fine at this volume, revisit if the
      // mentor roster ever reaches four figures.
      const { data: userList, error: listErr } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listErr) throw listErr
      const authById = new Map(userList.users.map((u) => [u.id, u]))

      const rows: KeyRequestRow[] = (requests ?? []).map((r) => {
        const profile = profileById.get(r.mentor_id)
        const authUser = authById.get(r.mentor_id)
        return {
          id: r.id,
          mentorId: r.mentor_id,
          mentorName: profile?.display_name || profile?.full_name || null,
          mentorEmail: authUser?.email ?? null,
          requested: r.requested,
          reason: r.reason,
          status: r.status,
          granted: r.granted,
          decidedAt: r.decided_at,
          decisionNote: r.decision_note,
          createdAt: r.created_at,
        }
      })

      return json({ success: true, rows })
    }

    // ---- request.decide -------------------------------------------------------
    if (action === 'request.decide') {
      const requestId = (body.requestId ?? '').trim()
      if (!requestId) return json({ success: false, error: 'Which request?' }, 400)
      if (body.decision !== 'approved' && body.decision !== 'declined') {
        return json({ success: false, error: 'decision must be "approved" or "declined".' }, 400)
      }

      const { data: reqRow, error: reqErr } = await svc
        .from('license_key_requests')
        .select('id, mentor_id, requested, status')
        .eq('id', requestId)
        .maybeSingle()
      if (reqErr) throw reqErr
      if (!reqRow) return json({ success: false, error: 'No such request.' }, 404)
      if (reqRow.status !== 'pending') {
        return json({ success: false, error: `This request was already ${reqRow.status}.` }, 400)
      }

      let grantedAmount: number | null = null
      let newQuota: number | null | undefined

      if (body.decision === 'approved') {
        grantedAmount = typeof body.granted === 'number' && body.granted > 0
          ? Math.floor(body.granted)
          : reqRow.requested

        const { data: mentorProfile, error: mentorErr } = await svc
          .from('profiles')
          .select('license_quota')
          .eq('id', reqRow.mentor_id)
          .maybeSingle()
        if (mentorErr) throw mentorErr

        // A null quota already means unlimited -- adding to it would be
        // meaningless, so the mentor's quota is left alone and only the
        // request itself is recorded as approved.
        if (mentorProfile && mentorProfile.license_quota !== null) {
          newQuota = mentorProfile.license_quota + grantedAmount
          const { error: quotaErr } = await svc
            .from('profiles')
            .update({ license_quota: newQuota })
            .eq('id', reqRow.mentor_id)
          if (quotaErr) throw quotaErr
        }
      }

      const { error: decideErr } = await svc
        .from('license_key_requests')
        .update({
          status: body.decision,
          granted: grantedAmount,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
          decision_note: body.note?.trim() || null,
        })
        .eq('id', requestId)
      if (decideErr) throw decideErr

      console.log(`[admin-approve-mentor] ${user.email ?? user.id} ${body.decision} request ${requestId}`)
      return json({ success: true, requestId, status: body.decision, granted: grantedAmount, quota: newQuota })
    }

    return json({ success: false, error: `Unknown action "${action}".` }, 400)
  } catch (err) {
    console.error('[admin-approve-mentor]', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
