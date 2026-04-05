import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Fetch all entries
    const { data: entries } = await supabase
      .from("entries")
      .select("content, reflection, tags, created_at")
      .eq("user_id", user.id)
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      if (aiResponse.status === 402)
        return new Response(
          JSON.stringify({ error: "Credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
