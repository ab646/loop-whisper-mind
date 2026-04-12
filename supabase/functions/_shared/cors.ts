/**
 * CORS configuration for Loop edge functions.
 * Add new origins here when deploying to custom domains.
 */
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "capacitor://localhost",
  "https://app.loopmind.care",
  "https://loop-whisper-mind.lovable.app",
  "https://loopmind.lovable.app",
  ...(Deno.env.get("CUSTOM_ORIGIN") ? [Deno.env.get("CUSTOM_ORIGIN")!] : []),
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow Lovable preview origins
  if (origin.endsWith(".lovableproject.com") || origin.endsWith(".lovable.app")) return true;
  return false;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    Vary: "Origin",
  };
}

export function corsResponse(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export function errorResponse(
  req: Request,
  message: string,
  status = 500
): Response {
  return jsonResponse(req, { error: message }, status);
}

/**
 * SEC-20: Reject requests that exceed a size limit.
 * Returns an error Response if too large, or null if OK.
 */
export function checkRequestSize(
  req: Request,
  maxBytes: number = 5 * 1024 * 1024 // 5 MB default
): Response | null {
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > maxBytes) {
    return errorResponse(req, "Request too large", 413);
  }
  return null;
}