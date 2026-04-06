/**
 * CORS configuration for Loop edge functions.
 * Add new origins here when deploying to custom domains.
 */
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  ...(Deno.env.get("CUSTOM_ORIGIN") ? [Deno.env.get("CUSTOM_ORIGIN")!] : []),
];

const ALLOWED_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com"];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin)
    ? origin
    : "https://loop-whisper-mind.lovable.app";
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