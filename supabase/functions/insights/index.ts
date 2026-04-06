import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.101.1";

const ALLOWED_ORIGINS = [
  "https://3600c0cf-3277-4366-8026-9dd38615e329.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: getCorsHeaders(req) });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all entries
    const { data: entries } = await adminClient
      .from("entries")
      .select("content, reflection, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!entries?.length) {
      return new Response(
        JSON.stringify({
          themes: [],
          triggers: [],
          factVsAssumption: null,
          weeklyInsight: null,
          isEmpty: true,
        }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const entrySummaries = entries
      .map(
        (e: any) =>
          `[${e.created_at}] "${e.content.substring(0, 300)}" | tags: ${(e.tags || []).join(", ")} | reflection: ${JSON.stringify(e.reflection || {}).substring(0, 200)}`
      )
      .join("\n");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You analyze journal entries to detect recurring emotional and cognitive patterns. Return a JSON object with:
{
  "themes": [{"name": "Theme Name", "mentions": number, "icon": "cloud"|"heart"|"briefcase"|"alert"}] (top 4-6 themes),
  "triggers": [{"label": "Trigger description", "detail": "BRIEF CORRELATION NOTE IN CAPS", "iconType": "message"|"mail"|"silence"}] (top 3),
  "factPercent": number (0-100, how often facts vs assumptions appear),
  "factExample": "A typical fact statement from entries",
  "assumptionExample": "A typical assumption from entries",
  "weeklyInsight": "One paragraph summary of the dominant emotional patterns this period. Be warm but insightful.",
  "improvementNote": "One sentence about a positive trend or area of growth, if any."
}

Return ONLY valid JSON.`,
            },
            {
              role: "user",
              content: `Analyze these ${entries.length} journal entries:\n${entrySummaries}`,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429)
        return new Response(
          JSON.stringify({ error: "Rate limited" }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      if (aiResponse.status === 402)
        return new Response(
          JSON.stringify({ error: "Credits exhausted" }),
          { status: 402, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    let insights;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch {
      insights = { themes: [], triggers: [], weeklyInsight: raw };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
