import { createClient } from "npm:@supabase/supabase-js@2.101.1";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";

// ── In-memory rate limiter ──────────────────────────────────────────
// Limits each IP to MAX_REQUESTS within WINDOW_MS to prevent email enumeration.
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5;   // max 5 lookups per IP per minute

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) return true;
  return false;
}

// Periodically clean up stale entries to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, WINDOW_MS);

// ── Handler ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    // Rate limit by IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (isRateLimited(clientIp)) {
      return errorResponse(req, "Too many requests. Please try again later.", 429);
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return errorResponse(req, "Email is required", 400);
    }

    // Normalize to lowercase to prevent case-variant enumeration
    const normalizedEmail = email.trim().toLowerCase();

    // Basic format check before hitting the DB
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return jsonResponse(req, { exists: false });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Check if any user with this email exists
    const { data, error } = await admin.rpc("check_email_exists", { lookup_email: normalizedEmail });

    if (error) {
      console.error("check_email_exists RPC failed");
      return jsonResponse(req, { exists: false });
    }

    return jsonResponse(req, { exists: !!data });
  } catch (e) {
    console.error("check-email: internal error");
    return errorResponse(req, "Internal error", 500);
  }
});
