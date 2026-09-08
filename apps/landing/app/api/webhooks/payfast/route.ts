import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// PayFast ITN (the POST side) is handled by the Supabase edge function, which
// owns the live signature check and the subscriptions/licenses writes. Only the
// read-only GET below is kept here — a subscription-status lookup by email, in
// case an older client still calls it.
//
// NOTE: `plan_type` (monthly/quarterly/lifetime) and the expiry logic predate
// the once-off R599/R349/R150 model. Stale; tracked as separate tech debt.

const novaHostUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const novaHostServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const novaHost = createClient(novaHostUrl, novaHostServiceKey);

// Android client endpoint to query subscription state by email.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const { data, error } = await novaHost
    .from('subscriptions')
    .select('status, plan_type, expires_at')
    .eq('email', email)
    .single();

  if (error || !data) {
    return NextResponse.json({ status: 'inactive' }, { status: 200 });
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    await novaHost.from('subscriptions').update({ status: 'expired' }).eq('email', email);
    return NextResponse.json({ status: 'expired', plan_type: data.plan_type }, { status: 200 });
  }

  return NextResponse.json(data, { status: 200 });
}
