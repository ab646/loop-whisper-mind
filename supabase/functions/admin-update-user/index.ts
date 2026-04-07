import { createClient } from "npm:@supabase/supabase-js@2.101.1";
import { corsResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userId = "8709db09-4a84-42f7-a7b8-9584b3729381";
  const googleIdentityId = "72bb9918-b8c2-422a-888d-820a95cd370b";

  // 1. Check if email was already updated
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const currentEmail = userData?.user?.email;

  let emailUpdated = false;
  if (currentEmail !== "test1@adrienbarbusse.com") {
    const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
      email: "test1@adrienbarbusse.com",
      email_confirm: true,
    });
    if (emailError) {
      return jsonResponse(req, { error: "email update failed", details: emailError.message }, 500);
    }
    emailUpdated = true;
  } else {
    emailUpdated = true;
  }

  // 2. Remove google identity via REST API
  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${userId}/identity/${googleIdentityId}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
    }
  );

  const unlinkOk = res.ok;
  const unlinkBody = await res.text();

  // 3. Also update app_metadata to remove google from providers
  if (unlinkOk) {
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { providers: ["email"], provider: "email" },
    });
  }

  return jsonResponse(req, {
    success: true,
    emailUpdated,
    currentEmail: "test1@adrienbarbusse.com",
    googleUnlinked: unlinkOk,
    unlinkResponse: unlinkBody,
  });
});
