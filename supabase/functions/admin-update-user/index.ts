import { createClient } from "npm:@supabase/supabase-js@2.101.1";
import { corsResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const userId = "8709db09-4a84-42f7-a7b8-9584b3729381";
  const googleIdentityId = "72bb9918-b8c2-422a-888d-820a95cd370b";

  // Try multiple endpoint patterns to delete the identity
  const endpoints = [
    `${supabaseUrl}/auth/v1/admin/users/${userId}/identities/${googleIdentityId}`,
    `${supabaseUrl}/auth/v1/admin/users/${userId}/identity/${googleIdentityId}`,
    `${supabaseUrl}/auth/v1/admin/identities/${googleIdentityId}`,
  ];

  let unlinkOk = false;
  let unlinkInfo = "";

  for (const url of endpoints) {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
    });
    const body = await res.text();
    unlinkInfo += `${url} => ${res.status}: ${body}\n`;
    if (res.ok) {
      unlinkOk = true;
      break;
    }
  }

  // Update app_metadata regardless
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { providers: ["email"], provider: "email" },
  });

  return jsonResponse(req, {
    success: true,
    googleUnlinked: unlinkOk,
    details: unlinkInfo,
  });
});
