import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import crypto from 'crypto';

const novaHostUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const novaHostServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const novaHost = createClient(novaHostUrl, novaHostServiceKey);

function validatePayfastSignature(data: Record<string, string>, signatureToMatch: string, passphrase: string): boolean {
  const payload = { ...data };
  delete payload.signature;

  const sortedKeys = Object.keys(payload).sort();
  const parts = [];
  for (const key of sortedKeys) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
      const encodedValue = encodeURIComponent(payload[key].trim()).replace(/%20/g, "+");
      parts.push(`${key}=${encodedValue}`);
    }
  }

  let pfOutput = parts.join("&");

  if (passphrase) {
    const encodedPassphrase = encodeURIComponent(passphrase.trim()).replace(/%20/g, "+");
    pfOutput += `&passphrase=${encodedPassphrase}`;
  }

  const calculatedSignature = crypto.createHash("md5").update(pfOutput).digest("hex");
  return calculatedSignature === signatureToMatch;
}

export async function POST(request: Request) {
  try {
    // PayFast ITN posts data as x-www-form-urlencoded
    const text = await request.text();
    const params = new URLSearchParams(text);
    
    const data: Record<string, string> = {};
    params.forEach((value, key) => {
      data[key] = value;
    });

    const paymentStatus = data['payment_status'];
    const email = data['email_address'];
    const pfPaymentId = data['pf_payment_id'];
    const amountGross = data['amount_gross'];

    // Verify signature strictly using the production passphrase
    const receivedSignature = data['signature'];
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';

    if (!receivedSignature) {
      console.error('Missing PayFast signature');
      return new NextResponse('Missing signature', { status: 400 });
    }

    const isValid = validatePayfastSignature(data, receivedSignature, passphrase);
    if (!isValid) {
      console.error('Invalid PayFast signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    if (paymentStatus === 'COMPLETE' && email) {
      const cleanEmail = email.trim().toLowerCase();
      const amount = amountGross ? parseFloat(amountGross) : 0;
      
      // Determine plan type purely based on actual amount paid (blocks client-side tampering)
      let planType = 'monthly';
      if (amount >= 3400) {
        planType = 'lifetime';
      } else if (amount >= 750) {
        planType = 'quarterly';
      } else {
        planType = 'monthly';
      }

      // Calculate expiration date
      let expiresAt: Date | null = new Date();
      if (planType === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (planType === 'quarterly') {
        expiresAt.setMonth(expiresAt.getMonth() + 3);
      } else if (planType === 'lifetime') {
        expiresAt = null; // No expiration
      }

      // Upsert subscription
      const { error } = await novaHost
        .from('subscriptions')
        .upsert({
          email: cleanEmail,
          plan_type: planType,
          status: 'active',
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          payfast_payment_id: pfPaymentId
        }, { onConflict: 'email' });

      if (error) {
        console.error('NovaHost error inserting subscription:', error);
        return new NextResponse('Database Error', { status: 500 });
      }

      // Generate and insert license key
      const generatedKey = `MH-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
      
      const { error: licenseError } = await novaHost
        .from('licenses')
        .upsert({
          email: cleanEmail,
          license_key: generatedKey,
          status: 'active',
          created_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (licenseError) {
        console.error('NovaHost error inserting license:', licenseError);
        return new NextResponse('Database Error', { status: 500 });
      }

      return new NextResponse('OK', { status: 200 });
    }

    // Acknowledge receipt even if not COMPLETE
    return new NextResponse('OK', { status: 200 });
    
  } catch (error) {
    console.error('Error processing PayFast ITN:', error);
    return new NextResponse('Server Error', { status: 500 });
  }
}

// Android client endpoint to query state
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
    // Expired
    await novaHost.from('subscriptions').update({ status: 'expired' }).eq('email', email);
    return NextResponse.json({ status: 'expired', plan_type: data.plan_type }, { status: 200 });
  }

  return NextResponse.json(data, { status: 200 });
}
