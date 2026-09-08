import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Admin-only. Grants, lists or revokes complimentary access to the NovaHost
 * app -- an admin types an email and that email gets past the paywall without
 * paying, exactly as if check-subscription-status had found a paid row.
 *
 * It writes public.subscriptions with the SERVICE ROLE because that table has
 * RLS on with only a self-read policy -- no browser client can write it.
 *
 * AUTH: a signed-in user who appears in public.admin_users. `verify_jwt` is on,
 * but that alone is NOT enough here -- the project's anon key is itself a valid
 * signed JWT and ships inside the APK -- so the body calls `auth.getUser()` and
 * then checks `admin_users`. Same pattern as support-reset-device.
 *
 * A grant never touches `device_id` / `token` on an existing row, so
 * re-granting does not knock a user's phone off its binding. On a fresh row
 * `device_id` stays null and the first handset to sign in with that email
 * claims it -- the same path a paying buyer takes.
 */

type Body = {
  action?: 'grant' | 'revoke' | 'list'
  email?: string
  appAccess?: boolean
  scanner?: boolean
  lifetime?: boolean
  expiry?: string | null
  note?: string
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
      console.warn('[admin-grant-access] rejected non-admin ' + user.id)
      return json({ success: false, error: 'Not authorised.' }, 403)
    }

    const actor = user.email ?? user.id
    const body = (await req.json().catch(() => ({}))) as Body
    const action = body.action ?? 'grant'
    const now = new Date().toISOString()

    // ---- list -----------------------------------------------------------
    if (action === 'list') {
      const { data, error } = await svc
        .from('subscriptions')
        .select('email, is_premium, is_lifetime, has_scanner, subscription_expiry, device_id, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return json({
        success: true,
        rows: (data ?? []).map((r) => ({
          email: r.email,
          appAccess: r.is_premium === true || r.is_lifetime === true,
          lifetime: r.is_lifetime === true,
          scanner: r.has_scanner === true,
          expiry: r.subscription_expiry,
          deviceBound: !!r.device_id,
          createdAt: r.created_at,
        })),
      })
    }

    const email = String(body.email ?? '').trim().toLowerCase()
    if (!email || !email.includes('@') || email.length < 5) {
      return json({ success: false, error: 'A valid email address is required.' }, 400)
    }

    const { data: existing, error: readErr } = await svc
      .from('subscriptions')
      .select('id, is_premium, is_lifetime, has_scanner, device_id')
      .eq('email', email)
      .maybeSingle()
    if (readErr) throw readErr

    // ---- revoke -------------------------------------------------------
    if (action === 'revoke') {
      if (!existing) {
        return json({ success: false, error: 'No subscription on record for that email.' }, 404)
      }
      const { error } = await svc
        .from('subscriptions')
        .update({
          is_premium: false,
          is_lifetime: false,
          has_scanner: false,
          subscription_expiry: null,
          updated_at: now,
        })
        .eq('id', existing.id)
      if (error) throw error
      console.log(`[admin-grant-access] ${actor} revoked access for ${email}`)
      return json({ success: true, email, revoked: true })
    }

    // ---- grant ------------------------------------------------------
    const appAccess = body.appAccess !== false // default true
    const scanner = body.scanner === true
    const lifetime = body.lifetime !== false // default true
    const expiry =
      !lifetime && body.expiry ? new Date(body.expiry).toISOString() : null

    if (!appAccess && !scanner) {
      return json({ success: false, error: 'Grant app access, the scanner, or both.' }, 400)
    }
    if (appAccess && !lifetime && !expiry) {
      return json({ success: false, error: 'A time-limited grant needs an expiry date.' }, 400)
    }
    if (expiry && new Date(expiry).getTime() <= Date.now()) {
      return json({ success: false, error: 'The expiry date must be in the future.' }, 400)
    }

    const fields: Record<string, unknown> = {
      email,
      is_premium: appAccess,
      is_lifetime: appAccess && lifetime,
      has_scanner: scanner,
      subscription_expiry: appAccess ? expiry : null,
      updated_at: now,
    }

    if (existing) {
      const { error } = await svc.from('subscriptions').update(fields).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await svc.from('subscriptions').insert(fields)
      if (error) throw error
    }

    console.log(
      `[admin-grant-access] ${actor} granted ${email} ` +
      `app=${fields.is_premium} lifetime=${fields.is_lifetime} scanner=${fields.has_scanner}` +
      (expiry ? ` until ${expiry}` : ''),
    )

    return json({
      success: true,
      email,
      appAccess: fields.is_premium,
      lifetime: fields.is_lifetime,
      scanner: fields.has_scanner,
      expiry: fields.subscription_expiry,
      created: !existing,
    })
  } catch (err) {
    console.error('admin-grant-access error:', err)
    return json({ success: false, error: (err as Error).message }, 500)
  }
})
