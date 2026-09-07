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
    const { licenseKey, email, eaName, planName } = await req.json().catch(() => ({}));

    if (!licenseKey || !email || !eaName || !planName) {
      return new Response(JSON.stringify({ error: 'Missing licenseKey, email, eaName, or planName' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const smtpHost = Deno.env.get('SMTP_HOST');

    // Where the app can actually be downloaded. Set APP_DOWNLOAD_URL once the
    // APK has a home; until then the button is omitted rather than pointed at a
    // domain that does not serve the app. The previous template linked to
    // novahost.co/download, which is a parked page -- every buyer who followed
    // it landed on a registrar placeholder holding a licence key they could not
    // use.
    const downloadUrl = Deno.env.get('APP_DOWNLOAD_URL') ?? '';

    // Sender address. Resend's onboarding@resend.dev works without verifying a
    // domain but will only deliver to the Resend account owner, so it is a
    // testing default and not a shipping one. Set MAIL_FROM to a verified
    // sender once the real domain is live -- the previous SMTP default was
    // no-reply@novahost.co, a parked domain with no mail configured, so that
    // path could never have delivered anything.
    const mailFrom = Deno.env.get('MAIL_FROM') ?? 'NovaHost <onboarding@resend.dev>';

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
        throw new Error(`Resend transmission failed: ${errText}`);
      }

      const resData = await res.json();
      return new Response(JSON.stringify({ success: true, provider: 'resend', id: resData.id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
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

      return new Response(JSON.stringify({ success: true, provider: 'smtp' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } else {
      console.error('send-license-email: No email credentials found. Production environment is not configured.');
      return new Response(JSON.stringify({ 
        error: 'No email service credentials configured. Please set RESEND_API_KEY or SMTP_HOST in the edge function secrets.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

  } catch (e) {
    console.error('send-license-email: Error', e);
    return new Response(JSON.stringify({ error: 'Unexpected error sending email', details: String(e) }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});
