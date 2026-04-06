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

    const { theme, question } = await req.json();
    if (!theme)
      return new Response(JSON.stringify({ error: "Theme required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });

    const normalizedTheme = theme.toUpperCase().trim();

    // Fetch entries related to this theme
    const { data: entries } = await adminClient
      .from("entries")
      .select("content, reflection, tags, created_at")
      .eq("user_id", userId)
      .contains("tags", [normalizedTheme])
      .order("created_at", { ascending: false })
      .limit(20);

    // Also fetch all entries for broader context
    const { data: allEntries } = await adminClient
      .from("entries")
      .select("content, reflection, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const themeEntries = (entries || [])
      .map(
        (e: any) =>
          `[${e.created_at}] "${e.content.substring(0, 300)}" | reflection: ${JSON.stringify(e.reflection || {}).substring(0, 200)}`
      )
      .join("\n");

    const allEntriesSummary = (allEntries || [])
      .map(
        (e: any) =>
          `[${e.created_at}] tags: ${(e.tags || []).join(", ")} | "${e.content.substring(0, 100)}"`
      )
      .join("\n");

    const userQuestion = question
      ? `The user is asking about this theme: "${question}". Answer their question based on the data.`
      : `Provide a deep analysis of this theme.`;

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
              content: `You analyze a user's recurring theme "${normalizedTheme}" from their journal entries. You are psychologically literate but NOT a therapist. Be warm, insightful, and grounded.

${question ? "The user asked a specific question. Answer it thoughtfully based on their data." : "Provide a deep theme analysis."}

Return a JSON object:
{
  "connectedBelief": "A core belief that seems connected to this theme (1-2 sentences, written as a quote the user might say)",
  "beliefTags": ["1-2 tags like Safety-seeking, Control, Perfectionism"],
  "triggers": [{"label": "Trigger name", "iconType": "heart"|"briefcase"|"calendar"}] (top 3 triggers for this theme),
  "entriesThisWeek": number,
  "patternInsight": "One insight about when/how this theme manifests (1-2 sentences)",
  "followUpQuestions": ["3 reflective questions the user could explore about this theme"],
  "answer": ${question ? '"A thoughtful 2-3 sentence answer to their specific question"' : "null"}
}

Return ONLY valid JSON.`,
            },
            {
              role: "user",
              content: `Theme: ${normalizedTheme}\n\nEntries tagged with this theme:\n${themeEntries || "No entries yet"}\n\nAll recent entries for context:\n${allEntriesSummary}`,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429)
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      if (aiResponse.status === 402)
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    let analysis;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        connectedBelief: raw,
        beliefTags: [],
        triggers: [],
        entriesThisWeek: 0,
        patternInsight: "",
        followUpQuestions: [],
        answer: null,
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("explore-theme error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
