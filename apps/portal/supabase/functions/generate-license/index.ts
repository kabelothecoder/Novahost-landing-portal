import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BATCH = 100;

function randomSegment() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0].toString(36).slice(-4).toUpperCase().padStart(4, '0');
}

function generateLicenseKey(prefix: string) {
  return `${prefix}-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const novaHost = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { fetch },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('generate-license: Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized - No auth header' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const { ea, plan, username, metadata: extraMeta, allowed_symbols, count: rawCount, label } = await req.json().catch(() => ({}));

    if (!ea || !plan) {
      return new Response(JSON.stringify({ error: 'Missing ea or plan' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Bulk generation: 1 by default, capped at MAX_BATCH so one call cannot
    // blow through a mentor's whole quota (or produce an unreviewable wall of
    // keys) from a single mistyped number.
    const parsedCount = Number(rawCount);
    const count = Number.isFinite(parsedCount) && parsedCount >= 1
      ? Math.min(Math.floor(parsedCount), MAX_BATCH)
      : 1;

    const { data: { user }, error: userErr } = await novaHost.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !user) {
      console.error('generate-license: Auth failed', { userErr, hasUser: !!user });
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userErr?.message }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Signing up does not make you a mentor -- an admin has to approve the
    // account first. The portal hides this page from a pending account, but the
    // function is reachable directly, so the refusal has to live here too.
    const { data: profile } = await novaHost
      .from('profiles')
      .select('approval_status, license_quota')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.approval_status !== 'approved') {
      console.warn(`generate-license: blocked ${profile?.approval_status ?? 'unknown'} account ${user.id}`);
      return new Response(JSON.stringify({ error: 'Your account is pending approval.' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Quota is a ceiling checked against a live count of what the mentor
    // actually holds, not a decrementing balance -- so it can never drift out
    // of sync with reality the way a counter that both sides have to remember
    // to update would. Null quota means unlimited.
    const quota = profile?.license_quota ?? null;
    if (quota !== null) {
      const { count: existingCount, error: countErr } = await novaHost
        .from('licenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (countErr) {
        console.error('generate-license: quota lookup failed', countErr);
        return new Response(JSON.stringify({ error: 'Could not check your key quota. Try again.' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      const used = existingCount ?? 0;
      if (used + count > quota) {
        return new Response(JSON.stringify({
          error: `You have used ${used} of ${quota} licence keys. Generating ${count} more would go ${used + count - quota} over your limit. Request more keys from an admin.`,
        }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
    }

    // --- Credits system bypassed for subscription model ---

    // Find product by name or code, scoped to this mentor. `code` is only
    // unique per (user_id, code) -- two mentors can and do name a robot the
    // same thing -- so an unscoped lookup can match more than one row and
    // make maybeSingle() error on a robot that genuinely belongs to the caller.
    let { data: product, error: prodErr } = await novaHost
      .from('expert_advisors')
      .select('id, code, name, display_name, avatar_url, background_video_url, symbols')
      .eq('user_id', user.id)
      .ilike('name', ea)
      .maybeSingle();

    if (!product) {
      const byCode = await novaHost
        .from('expert_advisors')
        .select('id, code, name, display_name, avatar_url, background_video_url, symbols')
        .eq('user_id', user.id)
        .eq('code', ea)
        .maybeSingle();
      product = byCode.data ?? null;
      // Replace, not merge: a successful fallback must clear the first
      // attempt's error, or a real product here still reads as "not found".
      prodErr = byCode.error;
    }

    if (!product || prodErr) {
      console.error('generate-license: product not found', { ea, prodErr });
      return new Response(JSON.stringify({ error: 'EA (product) not found', details: ea }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Find plan by name or code for the product
    let { data: planRow } = await novaHost
      .from('plans')
      .select('id, code, name, duration_days, max_devices')
      .eq('product_id', product.id)
      .ilike('name', plan)
      .maybeSingle();

    if (!planRow) {
      const byCode = await novaHost
        .from('plans')
        .select('id, code, name, duration_days, max_devices')
        .eq('product_id', product.id)
        .eq('code', plan)
        .maybeSingle();
      planRow = byCode.data ?? null;
    }

    if (!planRow) {
      console.error('generate-license: plan not found for product', { plan, product });
      return new Response(JSON.stringify({ error: 'Plan not found for product', details: plan }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `${planRow.code.slice(0, 2).toUpperCase()}${year}`;

    const getAbsoluteUrl = (path: any, fallback: string) => {
      if (!path || typeof path !== 'string' || path.trim() === '') return fallback;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path.replace(/^\//, '')}`;
    };

    // A batch shares one id (for later lookup) and one label, with each row
    // numbered against it. A single key keeps using the username exactly as
    // typed, unchanged from before bulk generation existed.
    const isBatch = count > 1;
    const batchId = isBatch ? crypto.randomUUID() : null;
    const batchLabel = (label && String(label).trim())
      || (username && String(username).trim())
      || `Batch ${new Date().toISOString().slice(0, 10)}`;

    const buildRow = (index: number) => ({
      owner_id: user.id,
      user_id: user.id,
      product_id: product.id,
      ea_id: product.id,
      plan_id: planRow.id,
      license_key: generateLicenseKey(prefix),
      max_devices: planRow.max_devices,
      metadata: {
        username: isBatch ? `${batchLabel} #${index + 1}` : username,
        ...(isBatch ? { batch_id: batchId, batch_index: index + 1 } : {}),
        expert_advisor_id: product.id,
        robot_id: product.id,
        robot_name: product.name,
        robot_code: product.code,
        plan_name: planRow.name,
        plan_code: planRow.code,
        display_name: product.display_name || product.name,
        avatar_url: getAbsoluteUrl(product.avatar_url, `${SUPABASE_URL}/storage/v1/object/public/avatars/default_robot.png`),
        background_image_url: getAbsoluteUrl(product.background_video_url, `${SUPABASE_URL}/storage/v1/object/public/avatars/default_background.png`),
        symbols: Array.isArray(product.symbols) ? product.symbols : [],
        ...(extraMeta ?? {}),
      },
      allowed_symbols: Array.isArray(product.symbols) ? product.symbols : [],
    });

    let lastInsertErr: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = Array.from({ length: count }, (_, i) => buildRow(i));
      const { data: inserted, error: insErr } = await novaHost
        .from('licenses')
        .insert(rows)
        .select('id, license_key, issued_at, expires_at, status, max_devices, ea_id, metadata');

      if (!insErr && inserted) {
        const body: Record<string, unknown> = { licenses: inserted, product, plan: planRow };
        // count === 1 keeps returning `license` exactly as before bulk
        // generation existed, so nothing already reading that field breaks.
        if (isBatch) body.batch_id = batchId;
        else body.license = inserted[0];
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      lastInsertErr = insErr;
      // A bulk insert is one statement -- a collision fails the whole batch,
      // it never leaves a partial batch behind. Only a key collision (23505)
      // is worth retrying with freshly generated keys: any other error (an
      // RLS refusal, a bad foreign key) fails identically on every attempt,
      // so retrying it just spends 5 attempts to report the wrong reason
      // ("could not generate a unique key") for a problem that was never
      // about uniqueness.
      if (insErr?.code !== '23505') break;
    }

    const isCollision = lastInsertErr?.code === '23505';
    return new Response(JSON.stringify({
      error: isCollision
        ? 'Failed to generate a unique license key after 5 attempts. Try again.'
        : (lastInsertErr?.message || 'Failed to create the license key.'),
    }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
