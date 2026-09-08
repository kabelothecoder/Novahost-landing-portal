import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { ea, plan, username, metadata: extraMeta, allowed_symbols } = await req.json().catch(() => ({}));

    if (!ea || !plan) {
      return new Response(JSON.stringify({ error: 'Missing ea or plan' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const { data: { user }, error: userErr } = await novaHost.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !user) {
      console.error('generate-license: Auth failed', { userErr, hasUser: !!user });
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userErr?.message }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // --- Credits system bypassed for subscription model ---

    // Find product by name or code
    let { data: product, error: prodErr } = await novaHost
      .from('expert_advisors')
      .select('id, code, name, display_name, avatar_url, background_video_url, symbols')
      .ilike('name', ea)
      .maybeSingle();

    if (!product) {
      const byCode = await novaHost
        .from('expert_advisors')
        .select('id, code, name, display_name, avatar_url, background_video_url, symbols')
        .eq('code', ea)
        .maybeSingle();
      product = byCode.data ?? null;
      prodErr = byCode.error ?? prodErr;
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

    let licenseKey = '';
    let lastInsertErr: any = null;

    const getAbsoluteUrl = (path: any, fallback: string) => {
      if (!path || typeof path !== 'string' || path.trim() === '') return fallback;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path.replace(/^\//, '')}`;
    };

    for (let i = 0; i < 5; i++) {
      licenseKey = generateLicenseKey(prefix);
      const { data: inserted, error: insErr } = await novaHost
        .from('licenses')
        .insert({
          owner_id: user.id,
          user_id: user.id,
          product_id: product.id,
          ea_id: product.id,
          plan_id: planRow.id,
          license_key: licenseKey,
          max_devices: planRow.max_devices,
          metadata: { 
            username, 
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
            ...(extraMeta ?? {}) 
          },
          allowed_symbols: Array.isArray(product.symbols) ? product.symbols : []
        })
        .select('id, license_key, issued_at, expires_at, status, max_devices, ea_id')
        .maybeSingle();

      if (!insErr && inserted) {
        return new Response(JSON.stringify({
          license: inserted,
          product,
          plan: planRow,
        }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      lastInsertErr = insErr;
    }

    return new Response(JSON.stringify({ error: 'Failed to generate unique license key', details: lastInsertErr?.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});