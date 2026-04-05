import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth validation
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for DB operations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { content, entryType, previousMessages } = await req.json();
    if (!content?.trim())
      return new Response(JSON.stringify({ error: "Content required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Fetch recent entries for context
    const { data: recentEntries } = await adminClient
      .from("entries")
      .select("content, reflection, tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const historyContext = recentEntries?.length
      ? `\n\nPrevious journal entries for pattern context:\n${recentEntries
          .map(
            (e: any) =>
              `- "${e.content.substring(0, 200)}" [tags: ${(e.tags || []).join(", ")}]`
          )
          .join("\n")}`
      : "";

    const conversationContext = previousMessages?.length
      ? `\n\nConversation so far in this session:\n${previousMessages
          .map((m: any) => `${m.role}: ${m.content.substring(0, 300)}`)
          .join("\n")}`
      : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY)
      throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are Loop, a reflective voice journal companion for overthinkers and people with anxious or ADHD-style rumination. You are NOT a therapist. You are a calm, psychologically literate mirror.

Your tone: calm, concise, grounded, non-authoritative, emotionally clear. Use phrases like "Here's what I'm noticing", "It sounds like", "You may be", "This seems connected to".

NEVER use: diagnostic language, certainty where there is ambiguity, therapy-role language, patronizing advice, excessive verbosity.

When a user shares a thought, return a structured reflection as a JSON object with these exact fields:
{
  "mainLoop": "A 1-2 sentence description of the cognitive/emotional loop the user seems stuck in",
  "feelings": ["array of 2-4 emotions you detect"],
  "knownVsAssumed": {
    "known": ["1-2 things that are factual based on what they said"],
    "assumed": ["1-2 things they may be assuming without evidence"]
  },
  "repeatingPattern": "Optional — if you notice a pattern from their history, describe it in 1 sentence. null if no pattern detected.",
  "oneQuestion": "A single reflective question that could help them see the loop differently",
  "nextStep": "One gentle, concrete grounding action (not advice)",
  "tags": ["1-3 UPPERCASE theme tags like AMBIGUITY, REJECTION, SELF-DOUBT, CONTROL, DECISION PARALYSIS, SAFETY, VALIDATION, OVERWHELM, SHAME, LONELINESS, AVOIDANCE, REASSURANCE, ATTACHMENT, STUCKNESS, LONGING, WORK ANXIETY"]
}

Return ONLY valid JSON. No markdown, no explanation.${historyContext}${conversationContext}`;

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
            { role: "system", content: systemPrompt },
            { role: "user", content },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429)
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      if (aiResponse.status === 402)
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent =
      aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (strip markdown fences if present)
    let reflection;
    try {
      const cleaned = rawContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      reflection = JSON.parse(cleaned);
    } catch {
      reflection = {
        mainLoop: rawContent,
        feelings: [],
        knownVsAssumed: { known: [], assumed: [] },
        repeatingPattern: null,
        oneQuestion: "What would help you feel grounded right now?",
        nextStep: "Take three slow breaths.",
        tags: [],
      };
    }

    // Save entry to database using admin client
    const { data: entry, error: insertError } = await adminClient
      .from("entries")
      .insert({
        user_id: user.id,
        entry_type: entryType || "text",
        content,
        reflection,
        tags: reflection.tags || [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return new Response(
      JSON.stringify({ reflection, entryId: entry?.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("reflect error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
