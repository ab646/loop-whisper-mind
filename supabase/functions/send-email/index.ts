/**
 * Supabase Auth Hook – Send Email (via Resend)
 *
 * Intercepts ALL Supabase auth emails (signup confirmation, password reset,
 * magic link, email change) and sends branded HTML via Resend.
 *
 * Must return { success: true } or Supabase falls back to its default mailer.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "node:crypto";

const RESEND_API = "https://api.resend.com/emails";
const FROM = "Loop Mind <hi@loopmind.care>";

/* ------------------------------------------------------------------ */
/*  Email templates                                                    */
/* ------------------------------------------------------------------ */

function verifyEmailHtml(confirmationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify your email</title></head>
<body style="margin:0;padding:0;background:#090b0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#090b0b;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#202626;border-radius:16px;padding:40px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f3f3;">Verify your email</p>
          <p style="margin:0 0 28px;font-size:15px;color:#8a9a9a;line-height:1.6;">One tap and you're in. Confirm your Loop Mind account.</p>
          <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#bfd8d8,#8ab8b8);color:#090b0b;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">Verify my email</a>
          <p style="margin:28px 0 0;font-size:12px;color:#4a5a5a;">Or copy this link:<br><span style="color:#bfd8d8;word-break:break-all;">${confirmationUrl}</span></p>
          <p style="margin:24px 0 0;font-size:12px;color:#4a5a5a;">If you didn't create a Loop Mind account, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function resetPasswordHtml(confirmationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your password</title></head>
<body style="margin:0;padding:0;background:#090b0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#090b0b;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#202626;border-radius:16px;padding:40px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f3f3;">Reset your password</p>
          <p style="margin:0 0 28px;font-size:15px;color:#8a9a9a;line-height:1.6;">Click below to set a new password for your Loop Mind account.</p>
          <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#bfd8d8,#8ab8b8);color:#090b0b;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">Reset my password</a>
          <p style="margin:28px 0 0;font-size:12px;color:#4a5a5a;">This link expires in 1 hour. If you didn't request a reset, ignore this email — your password won't change.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function magicLinkHtml(confirmationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your sign-in link</title></head>
<body style="margin:0;padding:0;background:#090b0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#090b0b;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#202626;border-radius:16px;padding:40px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f3f3;">Your sign-in link</p>
          <p style="margin:0 0 28px;font-size:15px;color:#8a9a9a;line-height:1.6;">Tap below to sign into Loop Mind — no password needed.</p>
          <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#bfd8d8,#8ab8b8);color:#090b0b;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">Sign me in</a>
          <p style="margin:28px 0 0;font-size:12px;color:#4a5a5a;">This link expires in 10 minutes and can only be used once.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("base64");
  return expected === signature;
}

type EmailTemplate = { subject: string; html: string };

function buildTemplate(actionType: string, confirmationUrl: string): EmailTemplate | null {
  switch (actionType) {
    case "signup":
      return { subject: "Verify your Loop Mind email", html: verifyEmailHtml(confirmationUrl) };
    case "recovery":
      return { subject: "Reset your Loop Mind password", html: resetPasswordHtml(confirmationUrl) };
    case "magic_link":
      return { subject: "Your Loop Mind sign-in link", html: magicLinkHtml(confirmationUrl) };
    case "email_change":
      return { subject: "Confirm your new Loop Mind email", html: verifyEmailHtml(confirmationUrl) };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

serve(async (req) => {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const HOOK_SECRET = Deno.env.get("AUTH_SEND_EMAIL_HOOK_SECRET");
    const rawBody = await req.text();

    if (HOOK_SECRET) {
      const signature = req.headers.get("x-supabase-webhook-signature") || "";
      if (!verifyWebhookSignature(rawBody, signature, HOOK_SECRET)) {
        console.error("send-email hook: invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const { user, email_data, email_action_type } = payload;

    const email = user?.email;
    if (!email) {
      console.error("send-email hook: no email in payload");
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://app.loopmind.care";
    const tokenHash = email_data?.token_hash || "";
    const redirectTo = email_data?.redirect_to || siteUrl;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    const typeMap: Record<string, string> = {
      signup: "signup",
      recovery: "recovery",
      magic_link: "magiclink",
      email_change: "email_change",
    };
    const verifyType = typeMap[email_action_type] || email_action_type;
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${verifyType}&redirect_to=${encodeURIComponent(redirectTo)}`;

    const template = buildTemplate(email_action_type, confirmationUrl);
    if (!template) {
      console.warn(`send-email hook: no template for "${email_action_type}", skipping`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("send-email hook: Resend API error", response.status, errorData);
      return new Response(
        JSON.stringify({ error: `Resend API error: ${response.status}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`send-email hook: sent "${email_action_type}" to ${email} via Resend`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email hook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
