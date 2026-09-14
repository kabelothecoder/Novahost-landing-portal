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
  action?: 'list' | 'approve' | 'reject'
  userId?: string
  note?: string
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

      const { data: updated, error: updErr } = await svc
        .from('profiles')
        .update({
          approval_status: status,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          approval_note: body.note?.trim() || null,
        })
        .eq('id', targetId)
        .select('id, approval_status')
        .maybeSingle()
      if (updErr) throw updErr
      if (!updated) return json({ success: false, error: 'No such mentor.' }, 404)

      console.log(`[admin-approve-mentor] ${user.email ?? user.id} set ${targetId} -> ${status}`)
      return json({ success: true, userId: updated.id, approvalStatus: updated.approval_status })
    }

    return json({ success: false, error: `Unknown action "${action}".` }, 400)
  } catch (err) {
    console.error('[admin-approve-mentor]', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
