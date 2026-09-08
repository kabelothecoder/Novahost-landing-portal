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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const novaHostAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { fetch },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('reactivate-license: Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized - No auth header' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Authenticate user via JWT
    const novaHostAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { fetch }
    });
    const { data: { user }, error: userErr } = await novaHostAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !user) {
      console.error('reactivate-license: Auth failed', { userErr, hasUser: !!user });
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userErr?.message }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const { license_id } = await req.json().catch(() => ({}));
    if (!license_id) {
       return new Response(JSON.stringify({ error: 'Missing license_id' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Lookup license & Verify ownership
    const { data: license, error: licErr } = await novaHostAdmin
        .from('licenses')
        .select('id, owner_id, status, expires_at, plan:plan_id(duration_days)')
        .eq('id', license_id)
        .maybeSingle();

    if (licErr || !license) {
        return new Response(JSON.stringify({ error: 'License not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Security Gate
    if (license.owner_id !== user.id) {
         return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Check Credits
    const { data: userCreditRow, error: credErr } = await novaHostAdmin
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credErr || !userCreditRow || userCreditRow.credits < 1) {
      return new Response(JSON.stringify({ error: 'Payment Required. Not enough credits.' }), { status: 402, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Deduct Credit
    const { error: deductErr } = await novaHostAdmin
      .from('user_credits')
      .update({ credits: userCreditRow.credits - 1 })
      .eq('user_id', user.id);
      
    if (deductErr) {
      return new Response(JSON.stringify({ error: 'Failed to deduct credit', details: deductErr.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Reactivate: extend expires_at
    const now = new Date();
    // @ts-ignore
    const durationDays = license.plan?.duration_days || 0; 
    const newExpiresAt = durationDays > 0 ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const { data: updatedLicense, error: updErr } = await novaHostAdmin
      .from('licenses')
      .update({
          status: 'active',
          expires_at: newExpiresAt
      })
      .eq('id', license.id)
      .select('*')
      .maybeSingle();

    if (updErr) {
        return new Response(JSON.stringify({ error: 'Failed to update license', details: updErr.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({
        license: updatedLicense,
        remainingCredits: userCreditRow.credits - 1
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
