import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Admin-only. Sends a one-off email to app users, mentors, or both -- a
 * maintenance notice, a launch announcement, a price change.
 *
 * Same authority pattern as admin-approve-mentor: `verify_jwt` only proves the
 * caller has A valid JWT (the anon key qualifies and ships inside the APK), so
 * the body re-checks `admin_users` and requires an aal2 session on top of it.
 *
 * "app users" are `subscriptions.email` -- an entitlement with usually no auth
 * account at all. "mentors" are every row in `profiles`, not just approved
 * ones: a pending mentor waiting on a decision still reads a maintenance
 * notice about a portal they expect to use. `email_broadcasts` is written
 * once per send so Broadcast.tsx has a history to show.
 */

type Audience = 'app_users' | 'mentors' | 'everyone'

type Body = {
  action?: 'audience.count' | 'send' | 'history'
  audience?: Audience
  subject?: string
  body?: string
}

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Plain text in, safe HTML out. Admins type a message, not markup. */
function broadcastHtml(subject: string, bodyText: string): string {
  const safeBody = escapeHtml(bodyText).replace(/\n/g, '<br>')
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#07070E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F2F4F8;">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:17px;font-weight:700;letter-spacing:-0.02em;color:#F2F4F8;">NovaHost</div>
      </div>
      <div style="background-color:#0E1015;border:1px solid #1D2029;border-radius:16px;padding:36px;">
        <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#FFFFFF;">${escapeHtml(subject)}</h1>
        <p style="margin:0;font-size:14.5px;line-height:1.7;color:#B0B6C2;">${safeBody}</p>
      </div>
      <div style="text-align:center;margin-top:28px;font-size:11.5px;color:#454B58;">
        &copy; ${new Date().getFullYear()} NovaHost
      </div>
    </div>
  </body>
  </html>`
}

/**
 * Every distinct address in the chosen audience, lower-cased so "everyone"
 * cannot double-mail someone who is both an app user and a mentor under
 * different letter-casing of the same address.
 */
// deno-lint-ignore no-explicit-any
async function resolveAudience(svc: any, audience: Audience): Promise<string[]> {
  const emails = new Set<string>()

  if (audience === 'app_users' || audience === 'everyone') {
    const { data, error } = await svc.from('subscriptions').select('email')
    if (error) throw error
    // deno-lint-ignore no-explicit-any
    for (const row of (data ?? []) as any[]) {
      if (row.email) emails.add(String(row.email).trim().toLowerCase())
    }
  }

  if (audience === 'mentors' || audience === 'everyone') {
    const { data: profiles, error: profErr } = await svc.from('profiles').select('id')
    if (profErr) throw profErr
    // deno-lint-ignore no-explicit-any
    const ids = new Set((profiles ?? []).map((p: any) => p.id))
    if (ids.size) {
      const { data: userList, error: listErr } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listErr) throw listErr
      // deno-lint-ignore no-explicit-any
      for (const u of userList.users as any[]) {
        if (ids.has(u.id) && u.email) emails.add(String(u.email).trim().toLowerCase())
      }
    }
  }

  return Array.from(emails)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })

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
      console.warn('[admin-broadcast] rejected non-admin ' + user.id)
      return json({ success: false, error: 'Not authorised.' }, 403)
    }

    if (assuranceLevel(jwt) !== 'aal2') {
      return json({
        success: false,
        error: 'Two-factor authentication is required for the admin console.',
        code: 'mfa_required',
      }, 403)
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const action = body.action ?? 'history'

    // ---- audience.count -----------------------------------------------------
    if (action === 'audience.count') {
      if (body.audience !== 'app_users' && body.audience !== 'mentors' && body.audience !== 'everyone') {
        return json({ success: false, error: 'audience must be "app_users", "mentors", or "everyone".' }, 400)
      }
      const recipients = await resolveAudience(svc, body.audience)
      return json({ success: true, count: recipients.length })
    }

    // ---- history --------------------------------------------------------------
    if (action === 'history') {
      const { data, error } = await svc
        .from('email_broadcasts')
        .select('id, audience, subject, recipient_count, sent_count, failed_count, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error

      // Mapped to camelCase here, same as every other admin function's JSON --
      // the browser never sees a raw snake_case column name.
      // deno-lint-ignore no-explicit-any
      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        audience: r.audience,
        subject: r.subject,
        recipientCount: r.recipient_count,
        sentCount: r.sent_count,
        failedCount: r.failed_count,
        createdAt: r.created_at,
      }))
      return json({ success: true, rows })
    }

    // ---- send -----------------------------------------------------------------
    if (action === 'send') {
      if (body.audience !== 'app_users' && body.audience !== 'mentors' && body.audience !== 'everyone') {
        return json({ success: false, error: 'audience must be "app_users", "mentors", or "everyone".' }, 400)
      }
      const subject = (body.subject ?? '').trim()
      const messageBody = (body.body ?? '').trim()
      if (!subject || !messageBody) {
        return json({ success: false, error: 'Subject and message are both required.' }, 400)
      }

      const apiKey = Deno.env.get('RESEND_API_KEY')
      const from = Deno.env.get('RESEND_FROM')
      if (!apiKey || !from) {
        return json({ success: false, error: 'Email is not configured. Set RESEND_API_KEY and RESEND_FROM in the edge function secrets.' }, 500)
      }

      const recipients = await resolveAudience(svc, body.audience)
      if (!recipients.length) {
        return json({ success: false, error: 'No recipients match that audience.' }, 400)
      }

      const html = broadcastHtml(subject, messageBody)
      let sentCount = 0
      let failedCount = 0

      // Resend's batch endpoint takes at most 100 messages per call.
      const CHUNK = 100
      for (let i = 0; i < recipients.length; i += CHUNK) {
        const chunk = recipients.slice(i, i + CHUNK)
        const payload = chunk.map((to) => ({ from, to: [to], subject, html }))
        try {
          const res = await fetch('https://api.resend.com/emails/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(payload),
          })
          if (res.ok) {
            sentCount += chunk.length
          } else {
            console.error('[admin-broadcast] Resend batch rejected a chunk', await res.text())
            failedCount += chunk.length
          }
        } catch (err) {
          console.error('[admin-broadcast] Resend batch request failed', err)
          failedCount += chunk.length
        }
      }

      const { data: logged, error: logErr } = await svc
        .from('email_broadcasts')
        .insert({
          sent_by: user.id,
          audience: body.audience,
          subject,
          body: messageBody,
          recipient_count: recipients.length,
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .select('id, created_at')
        .maybeSingle()
      if (logErr) throw logErr

      console.log(`[admin-broadcast] ${user.email ?? user.id} sent "${subject}" to ${body.audience} (${sentCount}/${recipients.length} ok)`)
      return json({
        success: true,
        id: logged?.id ?? null,
        recipientCount: recipients.length,
        sentCount,
        failedCount,
      })
    }

    return json({ success: false, error: `Unknown action "${action}".` }, 400)
  } catch (err) {
    console.error('[admin-broadcast]', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
