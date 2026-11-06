import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Admin-only. The review queue for device moves.
 *
 * A paid licence cannot change handset until a person approves it here. The
 * user states a reason and proves they can read the licence's mailbox
 * (request-device-move); the ticket then waits as `pending`. Approving it is
 * what lets generate-payfast-checkout price the R150 move and what lets
 * payfast-webhook grant it. Rejecting it ends the request and tells the user why.
 *
 *   list     { status?: 'pending' | 'decided' }   the queue, or recent decisions
 *   approve  { id, note? }
 *   reject   { id, note }                          the note is shown to the user
 *
 * AUTH: identical to admin-grant-access -- `auth.getUser()`, a row in
 * `admin_users`, and an aal2 session. verify_jwt alone is not enough: the anon
 * key is itself a valid signed JWT and ships inside the APK. Approving a move
 * hands one person's licence to another handset, so a stolen password must not
 * be enough to reach it.
 */

type Body = {
  action?: 'list' | 'approve' | 'reject'
  status?: 'pending' | 'decided'
  id?: string
  note?: string
}

/** How long an approval stays payable. Approving at hour 70 must not leave two hours to pay. */
const APPROVED_PAYABLE_HOURS = 48

/** Same value the user was told in the app. Keep in step with request-device-move. */
const NOTE_MAX_CHARS = 300

/** See admin-grant-access: only call on a token that has already been through getUser. */
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

function escapeHtml (s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

/**
 * Tells the user the answer. The app cannot push, so this email is how someone
 * who closed it finds out. A failed send must never undo the decision -- the
 * app shows the same answer next time it asks -- so this reports, it does not throw.
 */
async function emailDecision (
  to: string,
  approved: boolean,
  note: string | null,
): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM')
  if (!key || !from) {
    console.error('[admin-device-moves] RESEND_API_KEY / RESEND_FROM unset -- decision email not sent.')
    return false
  }

  const heading = approved ? 'Your device move is approved' : 'Your device move was declined'
  const body = approved
    ? 'Open NovaHost on your new phone and tap continue to finish the move. The request stays open for 48 hours.'
    : 'Your licence stays on the phone it is on now. If you think this is a mistake, reply to this email or contact support.'
  const noteBlock = note
    ? `<p style="margin:20px 0 0 0;padding:14px 16px;border-radius:12px;background:#0b0f19;color:#d1d5db;font-size:13px;line-height:1.6;text-align:left;">${escapeHtml(note)}</p>`
    : ''

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
      <div style="text-align:center;margin-bottom:40px;">
        <div style="font-size:28px;font-weight:800;letter-spacing:-0.05em;color:#5C9CE6;margin:0 0 10px 0;">NOVAHOST</div>
        <div style="font-size:12px;color:#4b5563;text-transform:uppercase;letter-spacing:0.15em;">Device Move</div>
      </div>
      <div style="background-color:#111827;border:1px solid #1f2937;border-radius:24px;padding:40px;text-align:center;">
        <h1 style="font-size:24px;font-weight:700;color:#ffffff;margin-top:0;margin-bottom:10px;">${heading}</h1>
        <p style="font-size:14px;color:#9ca3af;margin:0;line-height:1.6;">${body}</p>
        ${noteBlock}
      </div>
    </div>
  </body></html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [to], subject: heading, html }),
    })
    if (!res.ok) {
      console.error(`[admin-device-moves] Resend ${res.status}: ${await res.text()}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[admin-device-moves] decision email failed:', err)
    return false
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
    if (authErr || !user) return json({ success: false, error: 'Not authorised.' }, 401)

    const { data: admin, error: adminErr } = await svc
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (adminErr) throw adminErr
    if (!admin) {
      console.warn('[admin-device-moves] rejected non-admin ' + user.id)
      return json({ success: false, error: 'Not authorised.' }, 403)
    }

    if (assuranceLevel(jwt) !== 'aal2') {
      console.warn('[admin-device-moves] refused an aal1 session for ' + user.id)
      return json({
        success: false,
        error: 'Two-factor authentication is required for the admin console.',
        code: 'mfa_required',
      }, 403)
    }

    const actor = user.email ?? user.id
    const body = (await req.json().catch(() => ({}))) as Body
    const action = body.action ?? 'list'
    const nowIso = new Date().toISOString()

    // ---- list -----------------------------------------------------------
    if (action === 'list') {
      const decided = body.status === 'decided'

      let query = svc
        .from('device_move_tickets')
        .select(
          'id, email, reason, target_device_id, approval_status, created_at, verified_at, expires_at, consumed_at, decided_at, decided_by, decision_note',
        )
        .not('verified_at', 'is', null)

      if (decided) {
        // Grandfathered rows are not decisions anyone made.
        query = query
          .in('approval_status', ['approved', 'rejected'])
          .neq('decided_by', 'migration:grandfathered')
          .order('decided_at', { ascending: false })
          .limit(50)
      } else {
        query = query
          .eq('approval_status', 'pending')
          .is('consumed_at', null)
          .gt('expires_at', nowIso)
          .order('created_at', { ascending: true })
      }

      const { data: tickets, error } = await query
      if (error) throw error

      const emails = [...new Set((tickets ?? []).map((t) => t.email))]

      // What the admin needs to judge a reason: where the licence is now and
      // what it has done before. Without the history, "I got a new phone" from
      // an email that has moved twice this year looks the same as from one that
      // never has.
      const [{ data: subs, error: subErr }, { data: events, error: evErr }] = await Promise.all([
        emails.length
          ? svc.from('subscriptions').select('email, device_id, created_at, is_lifetime, is_premium').in('email', emails)
          : Promise.resolve({ data: [], error: null }),
        emails.length
          ? svc
              .from('subscription_device_events')
              .select('email, event, old_device_id, new_device_id, note, created_at')
              .in('email', emails)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ])
      if (subErr) throw subErr
      if (evErr) throw evErr

      const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000

      return json({
        success: true,
        rows: (tickets ?? []).map((t) => {
          const sub = (subs ?? []).find((s) => s.email === t.email)
          const history = (events ?? []).filter((e) => e.email === t.email)
          return {
            id: t.id,
            email: t.email,
            reason: t.reason ?? null,
            status: t.approval_status,
            targetDeviceId: t.target_device_id,
            currentDeviceId: sub?.device_id ?? null,
            licensedSince: sub?.created_at ?? null,
            requestedAt: t.created_at,
            decidedAt: t.decided_at,
            decidedBy: t.decided_by,
            decisionNote: t.decision_note,
            paid: t.consumed_at != null,
            movesLastYear: history.filter(
              (e) => e.event === 'move' && new Date(e.created_at).getTime() >= yearAgo,
            ).length,
            history: history.slice(0, 6).map((e) => ({
              event: e.event,
              at: e.created_at,
              note: e.note,
            })),
          }
        }),
      })
    }

    // ---- approve / reject -------------------------------------------------
    const id = String(body.id ?? '').trim()
    if (!id) return json({ success: false, error: 'A request id is required.' }, 400)

    const note = String(body.note ?? '').trim().replace(/\s+/g, ' ')
    if (note.length > NOTE_MAX_CHARS) {
      return json({ success: false, error: `Keep the note under ${NOTE_MAX_CHARS} characters.` }, 400)
    }

    const approve = action === 'approve'
    if (!approve && action !== 'reject') {
      return json({ success: false, error: 'Unknown action.' }, 400)
    }
    // A rejection with no explanation is a user staring at a dead end. They
    // cannot reply to the app.
    if (!approve && note.length < 5) {
      return json({ success: false, error: 'Say why you are declining. The user sees this.' }, 400)
    }

    // The status guard is in the UPDATE, not a prior read: two admins clicking
    // the same row must produce one decision and one 409, never two emails that
    // contradict each other.
    const { data: updated, error: updErr } = await svc
      .from('device_move_tickets')
      .update({
        approval_status: approve ? 'approved' : 'rejected',
        decided_at: nowIso,
        decided_by: actor,
        decision_note: note || null,
        ...(approve
          ? { expires_at: new Date(Date.now() + APPROVED_PAYABLE_HOURS * 60 * 60 * 1000).toISOString() }
          : {}),
      })
      .eq('id', id)
      .eq('approval_status', 'pending')
      .is('consumed_at', null)
      .not('verified_at', 'is', null)
      .select('id, email, reason')
      .maybeSingle()
    if (updErr) throw updErr

    if (!updated) {
      return json({
        success: false,
        error: 'That request is no longer pending. It may already have been decided, or expired.',
      }, 409)
    }

    console.log(
      `[admin-device-moves] ${actor} ${approve ? 'approved' : 'rejected'} move for ${updated.email}` +
      (note ? ` -- ${note}` : ''),
    )

    const emailed = await emailDecision(updated.email, approve, note || null)

    return json({
      success: true,
      id: updated.id,
      status: approve ? 'approved' : 'rejected',
      emailed,
    })
  } catch (err) {
    console.error('admin-device-moves error:', err)
    return json({ success: false, error: (err as Error).message }, 500)
  }
})
