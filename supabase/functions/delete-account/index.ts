import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { userId, adminClient } = await authenticateRequest(req);

    // Delete user data
    await adminClient.from("feedback").delete().eq("user_id", userId);
    await adminClient.from("entries").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // Delete the auth user (requires service role)
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw error;

    return jsonResponse(req, { success: true });
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(req, e.message, e.status);
    console.error("delete-account error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Deletion failed");
  }
});