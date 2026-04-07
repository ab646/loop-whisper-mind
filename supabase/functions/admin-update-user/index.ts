import { createClient } from "npm:@supabase/supabase-js@2.101.1";
import { getCorsHeaders, corsResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const userId = "8709db09-4a84-42f7-a7b8-9584b3729381";
  const googleIdentityId = "72bb9918-b8c2-422a-888d-820a95cd370b";

  // 1. Update email
  const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
    email: "test1@adrienbarbusse.com",
    email_confirm: true,
  });

  if (emailError) {
    return jsonResponse(req, { error: "email update failed", details: emailError.message }, 500);
  }

  // 2. Remove google identity
  const { error: unlinkError } = await admin.auth.admin.deleteIdentity(userId, googleIdentityId);

  return jsonResponse(req, {
    success: true,
    emailUpdated: true,
    googleUnlinked: !unlinkError,
    unlinkError: unlinkError?.message || null,
  });
});
