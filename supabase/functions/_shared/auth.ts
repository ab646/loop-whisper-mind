import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.101.1";

export interface AuthResult {
  userId: string;
  adminClient: SupabaseClient;
}

/**
 * Validates the JWT from the Authorization header and returns
 * the authenticated user ID + an admin Supabase client.
 *
 * NOTE: getClaims() requires @supabase/supabase-js >= 2.101.1
 * The import pins this version. If upgrading, verify getClaims() still exists.
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("No auth token provided", 401);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    throw new Error("Supabase environment is not configured correctly");
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsError } =
    await authClient.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    throw new AuthError("Unauthorized", 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  return { userId, adminClient };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}