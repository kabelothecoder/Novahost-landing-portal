import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing server configuration. Please set SUPABASE_SERVICE_ROLE_KEY.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const novaHost = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { fetch } });

    const body = await req.json().catch(() => ({}));
    const rawKey = body.license_key || body.licenseKey;
    const rawDevice = body.android_id || body.deviceId;
    
    // Determine client type
    const isAndroidClient = !!body.license_key || !!body.android_id;

    if (!rawKey || typeof rawKey !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing license key.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const licenseKey = rawKey.trim().toUpperCase();
    const deviceId = rawDevice ? String(rawDevice).trim() : '';

    // Query license + joined expert advisor info
    const { data: license, error: licErr } = await novaHost
      .from('licenses')
      .select(`
        id, 
        status, 
        expires_at, 
        max_devices, 
        allowed_symbols,
        metadata,
        ea_id,
        expert_advisors:expert_advisors!licenses_ea_id_fkey(
          id,
          name,
          code,
          description,
          avatar_url,
          background_video_url,
          accent_color,
          display_name,
          symbols,
          tts_script
        )
      `)
      .eq('license_key', licenseKey)
      .maybeSingle();

    if (licErr) {
      throw licErr;
    }

    if (!license) {
      if (isAndroidClient) {
        return new Response(
          JSON.stringify({ success: false, error: "License key not found." }),
          { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      } else {
        return new Response(
          JSON.stringify({ valid: false, reason: 'not_found' }),
          { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }
    }

    const product = license.expert_advisors as any;
    const eaObject = product ? {
      id: product.id,
      name: product.name,
      description: product.description || "",
      image_url: product.avatar_url || "",
      avatar_url: product.avatar_url || "",
      accent_color: product.accent_color || "#3b82f6",
      background_video_url: product.background_video_url || "",
      display_name: product.display_name || product.name,
      symbols: Array.isArray(product.symbols) ? product.symbols : [],
      tts_script: product.tts_script || ""
    } : null;

    // Handle Expiry
    const now = new Date();
    const expired = license.expires_at !== null && new Date(license.expires_at) < now;
    if (expired) {
      await novaHost.from('licenses').update({ status: 'expired' }).eq('id', license.id);
      
      if (isAndroidClient) {
        return new Response(
          JSON.stringify({ success: false, error: "License is inactive or expired." }),
          { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      } else {
        return new Response(JSON.stringify({ 
          valid: false, 
          reason: 'expired', 
          licenseStatus: 'expired',
          ea: eaObject 
        }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
      }
    }

    if (license.status !== 'active') {
      if (isAndroidClient) {
        return new Response(
          JSON.stringify({ success: false, error: "License is inactive or expired." }),
          { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      } else {
        return new Response(JSON.stringify({ 
          valid: false, 
          reason: license.status, 
          licenseStatus: license.status,
          ea: eaObject 
        }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
      }
    }

    // Android-specific Validation & Device locking
    if (isAndroidClient) {
      const metadata = license.metadata || {};
      const lockedDeviceId = metadata.device_id;

      if (lockedDeviceId && deviceId && lockedDeviceId !== deviceId) {
        return new Response(
          JSON.stringify({ success: false, error: "Device mismatch. This key is locked to another device." }),
          { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }

      if (!lockedDeviceId && deviceId) {
        metadata.device_id = deviceId;
        metadata.activated_at = new Date().toISOString();
        const { error: updErr } = await novaHost
          .from("licenses")
          .update({ metadata })
          .eq("id", license.id);
        if (updErr) throw updErr;
      }

      return new Response(
        JSON.stringify({
          success: true,
          product_name: product?.display_name || product?.name || "METAHOST AI",
          display_name: product?.display_name || product?.name || "METAHOST AI",
          product_code: product?.code ?? "METAHOST",
          avatar_url: product?.avatar_url ?? null,
          background_video_url: product?.background_video_url ?? null,
          accent_color: product?.accent_color ?? null,
          symbols: Array.isArray(product?.symbols) ? product.symbols : [],
          tts_script: product?.tts_script ?? "",
          allowed_symbols: license.allowed_symbols ?? [],
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Portal-specific Validation (Concurrency / Active sessions)
    const sessionWindow = new Date();
    sessionWindow.setMinutes(sessionWindow.getMinutes() - 10);

    const { count: activeSessions } = await novaHost
      .from('device_activations')
      .select('*', { count: 'exact', head: true })
      .eq('license_id', license.id)
      .eq('status', 'active')
      .gt('last_seen_at', sessionWindow.toISOString());

    const currentSessions = activeSessions ?? 0;

    const { data: existingSession } = await novaHost
      .from('device_activations')
      .select('id, last_seen_at')
      .eq('license_id', license.id)
      .eq('device_id', deviceId)
      .maybeSingle();

    const isRecentSession = existingSession && new Date(existingSession.last_seen_at) > sessionWindow;

    if (!isRecentSession && currentSessions >= license.max_devices) {
      return new Response(JSON.stringify({ 
        valid: false, 
        reason: 'concurrency_limit_reached', 
        activeSessions: currentSessions,
        maxSeats: license.max_devices,
        licenseStatus: license.status,
        ea: eaObject
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    if (deviceId) {
      const { error: upsertErr } = await novaHost
        .from('device_activations')
        .upsert({
          license_id: license.id,
          device_id: deviceId,
          last_seen_at: new Date().toISOString(),
          status: 'active',
        }, { onConflict: 'license_id,device_id' });

      if (upsertErr) throw upsertErr;
    }

    const remainingSeats = Math.max(0, license.max_devices - (isRecentSession ? currentSessions : currentSessions + 1));

    return new Response(JSON.stringify({
      valid: true,
      expiresAt: license.expires_at,
      maxSeats: license.max_devices,
      remainingSeats: remainingSeats,
      allowedSymbols: license.allowed_symbols,
      licenseStatus: license.status,
      display_name: eaObject?.display_name || null,
      avatar_url: eaObject?.avatar_url || null,
      symbols: eaObject?.symbols || [],
      tts_script: eaObject?.tts_script || "",
      ea: eaObject
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

  } catch (err: any) {
    console.error("validate-license error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});