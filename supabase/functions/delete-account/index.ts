import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { userId, adminClient } = await authenticateRequest(req);

    // Cascading deletion with verification for each table
    const tables = ["feedback", "entries", "profiles"] as const;
    for (const table of tables) {
      const { error: delError } = await adminClient
        .from(table)
        .delete()
        .eq("user_id", userId);
      if (delError) {
        console.error(`delete-account: failed to delete from ${table}`);
        throw new Error(`Failed to delete ${table} data`);
      }
      // Verify deletion succeeded — no rows should remain
      const { count } = await adminClient
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (count && count > 0) {
        console.error(`delete-account: ${count} rows remain in ${table} after deletion`);
        throw new Error(`Incomplete deletion in ${table}`);
      }
    }

    // Delete the auth user (requires service role)
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw error;

    return jsonResponse(req, { success: true });
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(req, e.message, e.status);
    console.error("delete-account error");
    return errorResponse(req, "Account deletion failed. Please contact support.");
  }
});