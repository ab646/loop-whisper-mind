/**
 * Re-engagement Nudge — Supabase Cron Function
 *
 * Runs daily. Finds users who:
 *   1. Have completed onboarding
 *   2. Have opted in to marketing emails (marketing_consent = true)
 *   3. Haven't created a journal entry in the last 3 days
 *   4. Have at least one entry (not brand-new)
 *
 * Sends each qualifying user a nudge email via Resend.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.101.1";

const RESEND_API = "https://api.resend.com/emails";
const FROM = "Loop Mind <hi@loopmind.care>";
const INACTIVITY_DAYS = 3;

function nudgeHtml(firstName: string, daysInactive: number): string {
  const name = firstName || "there";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your mind's been running loops</title></head>
<body style="margin:0;padding:0;background:#090b0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#090b0b;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#202626;border-radius:16px;padding:40px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f3f3;">Hey ${name} 👋</p>
          <p style="margin:0 0 20px;font-size:15px;color:#8a9a9a;line-height:1.6;">
            It's been ${daysInactive} days since your last entry. Whatever's been running through your head lately — it's worth getting out.
          </p>
          <table style="background:#1a2020;border-radius:12px;padding:20px;margin-bottom:28px;" cellpadding="0" cellspacing="0" width="100%">
            <tr><td>
              <p style="margin:0;font-size:14px;color:#bfd8d8;font-style:italic;line-height:1.6;">"The loop doesn't go quiet on its own. Writing it down is the first step to getting out."</p>
            </td></tr>
          </table>
          <a href="https://app.loopmind.care" style="display:inline-block;background:linear-gradient(135deg,#bfd8d8,#8ab8b8);color:#090b0b;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">Open Loop Mind</a>
          <p style="margin:28px 0 0;font-size:12px;color:#4a5a5a;">
            Don't want these reminders? <a href="https://app.loopmind.care/profile" style="color:#bfd8d8;">Update your preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!serviceRoleKey || !supabaseUrl) throw new Error("Missing Supabase environment variables");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("user_id, display_name")
      .eq("onboarding_complete", true)
      .eq("marketing_consent", true);

    if (profilesError) throw profilesError;
    if (!profiles?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no eligible users" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);

    const eligibleUsers: Array<{ userId: string; displayName: string; email: string }> = [];

    for (const profile of profiles) {
      const { data: latestEntry } = await adminClient
        .from("entries")
        .select("created_at")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!latestEntry) continue;
      if (new Date(latestEntry.created_at) > cutoffDate) continue;

      const { data: authUser } = await adminClient.auth.admin.getUserById(profile.user_id);
      if (!authUser?.user?.email) continue;

      eligibleUsers.push({
        userId: profile.user_id,
        displayName: profile.display_name || "",
        email: authUser.user.email,
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of eligibleUsers) {
      try {
        const response = await fetch(RESEND_API, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: [user.email],
            subject: "Your mind's been running loops...",
            html: nudgeHtml(user.displayName, INACTIVITY_DAYS),
          }),
        });

        if (response.ok) {
          sentCount++;
          console.log(`reengagement-nudge: sent to ${user.email}`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(`reengagement-nudge: failed for ${user.email}`, response.status, errorData);
          errors.push(`${user.email}: ${response.status}`);
        }
      } catch (err) {
        console.error(`reengagement-nudge: error for ${user.email}`, err);
        errors.push(`${user.email}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    console.log(`reengagement-nudge: sent ${sentCount}/${eligibleUsers.length} emails`);

    return new Response(
      JSON.stringify({ sent: sentCount, eligible: eligibleUsers.length, errors: errors.length ? errors : undefined }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("reengagement-nudge error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
