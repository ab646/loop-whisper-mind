import { createClient } from "npm:@supabase/supabase-js@2.101.1";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return errorResponse(req, "Email is required", 400);
    }

    // Basic format check before hitting the DB
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(req, { exists: false });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Check if any user with this email exists
    const { data, error } = await admin.rpc("check_email_exists", { lookup_email: email });

    if (error) {
      console.error("check_email_exists error:", error);
      return jsonResponse(req, { exists: false });
    }

    return jsonResponse(req, { exists: !!data });
  } catch (e) {
    console.error("check-email error:", e);
    return errorResponse(req, "Internal error", 500);
  }
});
