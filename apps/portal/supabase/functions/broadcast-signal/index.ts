import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const novaHost = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ---- 1. WHO IS CALLING? -------------------------------------------------
    // Deployed with verify_jwt:true, so a missing/expired/forged JWT is rejected
    // by the platform before this code runs. Here we resolve the real identity.
    const authHeader = req.headers.get('authorization') ?? ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')

    const { data: { user }, error: authError } = jwt
      ? await novaHost.auth.getUser(jwt)
      : { data: { user: null }, error: new Error('Missing credentials') }

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Forbidden: Not signed in' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const {
      ea_id, pair, lot, side, type, sl, tp, signal_id, adminBalance,
      // Pending-order fields. `type` above is the legacy side fallback and is a
      // different thing entirely — do not conflate them.
      order_type, price, pending_expiry_seconds,
    } = body

    // ---- 2. DO THEY OWN THIS BOT? -------------------------------------------
    // Portal registration is public, so a valid JWT only proves "signed up",
    // not "is a mentor". Authorization is by OWNERSHIP: expert_advisors.user_id
    // records which mentor created each bot. A mentor may only broadcast to
    // bots they own — this is what stops mentor A pushing trades to mentor B's
    // paying subscribers.
    const { data: ownedEas, error: eaError } = await novaHost
      .from('expert_advisors')
      .select('id')
      .eq('user_id', user.id)

    if (eaError) throw eaError

    const ownedIds = (ownedEas ?? []).map((e: { id: string }) => e.id)

    if (ownedIds.length === 0) {
      // Signed-in, but owns no bots => not a mentor. This is the case that a
      // plain JWT check would have let through.
      return new Response(JSON.stringify({ error: 'Forbidden: No bots owned by this account' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // "ALL" from the portal arrives as MASTER_OVERRIDE. It must mean "all of MY
    // bots", never "every bot on the platform" — otherwise one mentor's signal
    // reaches every user of every other mentor.
    const isBroadcastAll = ea_id === 'MASTER_OVERRIDE'
    const targetEaIds = isBroadcastAll ? ownedIds : [ea_id]

    if (!isBroadcastAll && !ownedIds.includes(ea_id)) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not own this bot' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ---- 3. NORMALIZATION ---------------------------------------------------
    const cleanPair = pair.replace(/[^A-Z0-9]/g, '').toUpperCase()
      .replace('.PRO', '').replace('.RAW', '').replace('.M', '')
      .replace('.SB', '').replace('.ECN', '')

    // ---- 3b. ORDER KIND -----------------------------------------------------
    // MARKET unless the mentor asked for a level. Mirrors toOrderType() in
    // metacopier-execute, which rejects anything outside this set rather than
    // guessing — so an unrecognised value must fail here, loudly, instead of
    // being stored and silently dropped at execution.
    const orderKind = String(order_type ?? 'MARKET').trim().toUpperCase()

    if (!['MARKET', 'LIMIT', 'STOP'].includes(orderKind)) {
      return new Response(JSON.stringify({
        error: `Unknown order type "${order_type}". Expected MARKET, LIMIT or STOP.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isPendingOrder = orderKind !== 'MARKET'
    const entryPrice =
      (price === undefined || price === null || price === '') ? null : Number(price)

    // A pending order without a level is not executable. Refusing it here means
    // the mentor is told now, rather than every subscriber's terminal rejecting
    // it independently minutes later.
    if (isPendingOrder && (entryPrice === null || !Number.isFinite(entryPrice) || entryPrice <= 0)) {
      return new Response(JSON.stringify({
        error: `A ${orderKind} order needs the price to wait at.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const expirySeconds =
      (pending_expiry_seconds === undefined || pending_expiry_seconds === null || pending_expiry_seconds === '')
        ? null
        : Number(pending_expiry_seconds)

    if (expirySeconds !== null && (!Number.isFinite(expirySeconds) || expirySeconds <= 0)) {
      return new Response(JSON.stringify({
        error: 'Expiry must be a positive number of seconds, or omitted for good-till-cancelled.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ---- 4. DEDUPLICATION ---------------------------------------------------
    if (signal_id) {
      const { data: existing } = await novaHost
        .from('signals')
        .select('id')
        .eq('signal_id', signal_id)
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ success: true, message: 'Duplicate signal ignored' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // ---- 5. PERSISTENCE -----------------------------------------------------
    // One row per targeted bot, so each signal is attributable to a specific
    // mentor's bot and subscribers can be filtered by ea_id on the client.
    const rows = targetEaIds.map((targetEa: string, idx: number) => ({
      ea_id: targetEa,
      pair: cleanPair,
      side: (side || type || 'BUY').toUpperCase(),
      // Null when the mentor left it blank, never a default. `lot || 0.01`
      // turned "the subscriber decides" into "everybody trades one micro lot",
      // which silently overrode every user's own sizing plan.
      lot: (lot === undefined || lot === null || lot === '') ? null : Number(lot),
      sl,
      tp,
      order_type: orderKind,
      // Only stored for the pending kinds. A market order carrying a price
      // would be a level the executor is obliged to ignore, and a stale level
      // in the record is worse than none.
      price: isPendingOrder ? entryPrice : null,
      pending_expiry_seconds: isPendingOrder ? expirySeconds : null,
      // signal_id is uniquely indexed; suffix when fanning out to several bots
      signal_id: signal_id
        ? (targetEaIds.length > 1 ? `${signal_id}:${idx}` : signal_id)
        : null,
      status: 'broadcasted'
    }))

    const { data: signalData, error: dbError } = await novaHost
      .from('signals')
      .insert(rows)
      .select()

    if (dbError) throw dbError

    // ---- 6. FAN-OUT ---------------------------------------------------------
    // Emit one event per bot. Clients subscribe filtered by the ea_id their
    // license is tied to, so a user only ever receives their own mentor's calls.
    const channel = novaHost.channel('signals')
    for (const row of signalData ?? []) {
      await channel.send({
        type: 'broadcast',
        event: 'new-signal',
        payload: {
          id: row.id,
          ea_id: row.ea_id,
          pair: row.pair,
          side: row.side,
          lot: row.lot,
          sl: row.sl,
          tp: row.tp,
          // Named as metacopier-execute expects them, so the realtime payload
          // and the claim-signals payload stay interchangeable on the handset.
          order_type: row.order_type,
          open_price: row.price,
          pending_expiry_seconds: row.pending_expiry_seconds,
          adminBalance: adminBalance || 0
        }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      signalIds: (signalData ?? []).map((r: { id: string }) => r.id),
      botsTargeted: targetEaIds.length,
      message: 'Signal broadcasted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Broadcast Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
