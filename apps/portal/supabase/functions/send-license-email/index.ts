import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  try {
    const { licenseKey, email, eaName, planName } = await req.json().catch(() => ({}));

    if (!licenseKey || !email || !eaName || !planName) {
      return json({ error: 'Missing licenseKey, email, eaName, or planName' }, 400);
    }

    // ---- Who is asking, and is this their key to send? -----------------------
    // verify_jwt only proves the caller HAS a valid JWT -- the project's anon
    // key is itself a valid signed JWT and it ships inside the mobile app, so
    // without this block any caller could mail any licence key to any address.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const novaHost = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { fetch },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized - No auth header' }, 401);
    }

    const { data: { user }, error: userErr } = await novaHost.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !user) {
      return json({ error: 'Unauthorized', details: userErr?.message }, 401);
    }

    const { data: profile } = await novaHost
      .from('profiles')
      .select('approval_status')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.approval_status !== 'approved') {
      return json({ error: 'Your account is pending approval.' }, 403);
    }

    // The key must belong to the caller -- without this, an approved mentor
    // could email a DIFFERENT mentor's licence key to an address of their own
    // choosing, since licenseKey/email/eaName/planName are otherwise just
    // caller-supplied strings with nothing tying them to a real row.
    const { data: license, error: licErr } = await novaHost
      .from('licenses')
      .select('id')
      .eq('license_key', String(licenseKey).toUpperCase())
      .eq('user_id', user.id)
      .maybeSingle();
    if (licErr) {
      console.error('send-license-email: license lookup failed', licErr);
      return json({ error: 'Could not verify that licence key. Try again.' }, 500);
    }
    if (!license) {
      return json({ error: 'That licence key does not belong to you.' }, 403);
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const smtpHost = Deno.env.get('SMTP_HOST');

    // Sender address. There is no working default here on purpose: Resend's
    // onboarding@resend.dev sandbox sender delivers ONLY to the Resend account
    // owner, so a fallback to it does not fail -- it succeeds silently for
    // every test send and fails silently for every real buyer, which is
    // exactly the shape of bug that is hardest to notice. RESEND_FROM must be
    // a sender on a domain verified in Resend (novahost-ea.app).
    const mailFrom = Deno.env.get('RESEND_FROM');
    if (!mailFrom) {
      console.error('send-license-email: RESEND_FROM is not set');
      return json({ error: 'Email sender is not configured. Set RESEND_FROM in the edge function secrets.' }, 500);
    }

    // Where the app can actually be downloaded. Set APP_DOWNLOAD_URL once the
    // APK has a home; until then the button is omitted rather than pointed at a
    // domain that does not serve the app. The previous template linked to
    // novahost.co/download, which is a parked page -- every buyer who followed
    // it landed on a registrar placeholder holding a licence key they could not
    // use.
    const downloadUrl = Deno.env.get('APP_DOWNLOAD_URL') ?? '';

    // Table layout and inline styles throughout: Outlook and Gmail strip most
    // <style> blocks and support neither flexbox nor grid. The visor gradient is
    // layered OVER a solid background-color so a client that drops the gradient
    // still renders a readable button rather than transparent text.
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your NovaHost licence key</title>
    </head>
    <body style="margin:0;padding:0;background-color:#07070E;">
      <!-- Preheader: what shows in the inbox list, hidden in the body. -->
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        Your ${eaName} licence key is ready. Paste it into the NovaHost app to activate.
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#07070E;padding:32px 16px;">
        <tr>
          <td align="center">

            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0E1015;border:1px solid #1D2029;border-radius:16px;overflow:hidden;">

              <!-- Gradient hairline, the brand's visor -->
              <tr>
                <td style="height:3px;background-color:#A855F7;background-image:linear-gradient(100deg,#F0439E 0%,#A855F7 48%,#22C9E8 100%);font-size:0;line-height:0;">&nbsp;</td>
              </tr>

              <tr>
                <td style="padding:36px 36px 8px 36px;">
                  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;color:#F2F4F8;letter-spacing:-0.02em;">
                    NovaHost
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 36px 0 36px;">
                  <div style="display:inline-block;background-color:#14171E;border:1px solid #23262F;border-radius:999px;padding:6px 14px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#A9B0BF;">
                    ${eaName} &middot; ${planName}
                  </div>
                  <h1 style="margin:20px 0 0 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:27px;line-height:1.15;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;">
                    Your licence key is ready
                  </h1>
                  <p style="margin:12px 0 0 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#98A0B0;">
                    This key activates <strong style="color:#E7EAF1;">${eaName}</strong> on one handset. Keep it to yourself &mdash; it binds to the first device that uses it.
                  </p>
                </td>
              </tr>

              <!-- The key -->
              <tr>
                <td style="padding:28px 36px 0 36px;">
                  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#6C7484;padding-bottom:10px;">
                    Your activation key
                  </div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#07070E;border:1px solid #2A2E3A;border-radius:10px;padding:20px;text-align:center;font-family:'SF Mono',Consolas,'Courier New',monospace;font-size:21px;font-weight:700;letter-spacing:0.10em;color:#22C9E8;word-break:break-all;">
                        ${licenseKey}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Steps -->
              <tr>
                <td style="padding:30px 36px 0 36px;">
                  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#6C7484;padding-bottom:14px;">
                    How to activate
                  </div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.55;color:#A6ADBC;">
                    <tr>
                      <td width="26" valign="top" style="color:#22C9E8;font-weight:700;padding-bottom:12px;">1.</td>
                      <td valign="top" style="padding-bottom:12px;">Install the NovaHost app on your Android phone.</td>
                    </tr>
                    <tr>
                      <td width="26" valign="top" style="color:#22C9E8;font-weight:700;padding-bottom:12px;">2.</td>
                      <td valign="top" style="padding-bottom:12px;">Open it and paste the key above into the activation screen.</td>
                    </tr>
                    <tr>
                      <td width="26" valign="top" style="color:#22C9E8;font-weight:700;">3.</td>
                      <td valign="top">Link your MT4 or MT5 account, and your mentor&rsquo;s trades start arriving.</td>
                    </tr>
                  </table>
                </td>
              </tr>

              ${downloadUrl ? `
              <tr>
                <td style="padding:30px 36px 0 36px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#A855F7;background-image:linear-gradient(100deg,#F0439E 0%,#A855F7 48%,#22C9E8 100%);border-radius:999px;">
                        <a href="${downloadUrl}" style="display:inline-block;padding:14px 30px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#07070E;text-decoration:none;">
                          Download the app
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              <tr>
                <td style="padding:30px 36px 34px 36px;">
                  <div style="border-top:1px solid #1D2029;padding-top:18px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#5B6272;">
                    <p style="margin:0 0 6px 0;">Your mentor issued this key. NovaHost hosts the robot and copies its trades to your own broker account &mdash; we never hold your funds.</p>
                    <p style="margin:0;">If you were not expecting this email, you can ignore it. The key does nothing until it is activated.</p>
                  </div>
                </td>
              </tr>
            </table>

            <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11.5px;color:#454B58;padding-top:18px;">
              &copy; ${new Date().getFullYear()} NovaHost
            </div>

          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    if (resendApiKey) {
      console.log('send-license-email: Sending via Resend API');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: mailFrom,
          to: [email],
          subject: `Your NovaHost License for ${eaName} is Ready`,
          html: htmlContent,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('send-license-email: Resend API error', errText);
        // Surface Resend's own reason -- the most common one, until the
        // sending domain is verified, is the sandbox sender refusing any
        // recipient other than the account owner.
        let reason = errText;
        try {
          const parsed = JSON.parse(errText);
          reason = parsed?.message ?? parsed?.error ?? errText;
        } catch { /* keep raw text */ }
        return json({ error: `Email provider rejected the send: ${reason}` }, 502);
      }

      const resData = await res.json();
      return json({ success: true, provider: 'resend', id: resData.id });
    } else if (smtpHost) {
      console.log('send-license-email: Sending via SMTP');
      // Import safe_smtp dynamically to avoid bundling issues
      const { SMTPClient } = await import("https://deno.land/x/safe_smtp/mod.ts");

      const client = new SMTPClient({
        connection: {
          hostname: smtpHost,
          port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
          tls: true,
          auth: {
            username: Deno.env.get('SMTP_USER') || '',
            password: Deno.env.get('SMTP_PASS') || '',
          }
        }
      });

      await client.send({
        from: mailFrom,
        to: email,
        subject: `Your NovaHost License for ${eaName} is Ready`,
        html: htmlContent,
      });

      await client.close();

      return json({ success: true, provider: 'smtp' });
    } else {
      console.error('send-license-email: No email credentials found. Production environment is not configured.');
      return json({ error: 'No email service credentials configured. Set RESEND_API_KEY or SMTP_HOST in the edge function secrets.' }, 500);
    }

  } catch (e) {
    console.error('send-license-email: Error', e);
    return json({ error: 'Unexpected error sending email', details: String(e) }, 500);
  }
});
