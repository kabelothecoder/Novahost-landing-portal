import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const novaHostAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { fetch } });

    // Require a valid user JWT (default verify_jwt = true)
    const novaHostAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { fetch },
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    });
    const { data: userData } = await novaHostAuth.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const adminId = userData.user.id;
    const { action, query, licenseKey } = await req.json().catch(() => ({}));

    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      const q = query.trim();
      const byKey = await novaHostAdmin
        .from('licenses')
        .select('id, license_key, status, expires_at, metadata, product:product_id(name), plan:plan_id(name)')
        .eq('user_id', adminId)
        .ilike('license_key', `%${q}%`);

      const byUser = await novaHostAdmin
        .from('licenses')
        .select('id, license_key, status, expires_at, metadata, product:product_id(name), plan:plan_id(name)')
        .eq('user_id', adminId)
        .contains('metadata', { username: q });

      const items = [ ...(byKey.data ?? []), ...(byUser.data ?? []) ];
      // Deduplicate by id
      const map = new Map<string, any>();
      for (const it of items) map.set(it.id, it);
      const results = Array.from(map.values());

      return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (action === 'reactivate') {
      if (!licenseKey) {
        return new Response(JSON.stringify({ error: 'Missing licenseKey' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      const { data: lic, error: licErr } = await novaHostAdmin
        .from('licenses')
        .select('id, status, plan:plan_id(duration_days), product:product_id(name), plan_info:plan_id(name), license_key')
        .eq('license_key', licenseKey)
        .eq('user_id', adminId)
        .maybeSingle();

      if (licErr) {
        return new Response(JSON.stringify({ error: licErr.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      if (!lic) {
        return new Response(JSON.stringify({ error: 'License not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      const now = new Date();
      const newExpiry = lic.plan?.duration_days == null ? null : new Date(now.getTime() + lic.plan.duration_days * 24 * 60 * 60 * 1000).toISOString();

      const { data: updated, error: upErr } = await novaHostAdmin
        .from('licenses')
        .update({ status: 'active', expires_at: newExpiry })
        .eq('id', lic.id)
        .eq('user_id', adminId)
        .select('id, status, expires_at')
        .maybeSingle();

      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      return new Response(JSON.stringify({
        license: { ...updated, license_key: lic.license_key },
        product: { name: lic.product?.name },
        plan: { name: lic.plan_info?.name, duration_days: lic.plan?.duration_days },
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
