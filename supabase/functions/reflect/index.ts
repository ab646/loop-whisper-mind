import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";
import { chatCompletionJSON, AIError } from "../_shared/ai.ts";

/**
 * Loop Reflection Engine
 *
 * This is the core intelligence of Loop. When a user shares a thought,
 * this function mirrors it back with psychological structure — identifying
 * the cognitive loop, separating fact from assumption, and detecting
 * patterns across their history.
 *
 * It is NOT therapy. It's a structured mirror that helps overthinkers
 * see their own patterns more clearly.
 */

interface Reflection {
  mainLoop: string;
  loopType: "rumination" | "anticipatory" | "decisional" | "self-critical" | "relational" | "existential";
  feelings: string[];
  intensity: "low" | "moderate" | "high";
  intensityScore: number;
  knownVsAssumed: {
    known: string[];
    assumed: string[];
  };
  repeatingPattern: string | null;
  temporalShift: string | null;
  oneQuestion: string;
  nextStep: string;
  tags: string[];
}

const REFLECTION_FALLBACK: Reflection = {
  mainLoop: "",
  loopType: "rumination",
  feelings: [],
  intensity: "moderate",
  intensityScore: 2,
  knownVsAssumed: { known: [], assumed: [] },
  repeatingPattern: null,
  temporalShift: null,
  oneQuestion: "What would help you feel grounded right now?",
  nextStep: "Take three slow breaths and notice one thing you can see.",
  tags: [],
};

function buildSystemPrompt(
  historyContext: string,
  conversationContext: string
): string {
  return `You are Loop, a reflective journal companion for people with anxious or ADHD-style thinking patterns. You are NOT a therapist or counselor. You are a psychologically literate mirror — you help people see the shape of their own thoughts.

## YOUR VOICE
- Calm, precise, grounded. Like a thoughtful friend who studied psychology.
- Use: "Here's what I'm noticing", "It sounds like", "There may be", "This seems connected to"
- NEVER use: diagnostic labels, clinical certainty, therapy-speak ("how does that make you feel"), patronizing advice, or hollow reassurance
- Keep language concrete. Name specific thoughts and feelings, not abstractions.
- Be warm but not soft. Clarity is kindness.

## COGNITIVE LOOP DETECTION
Identify which type of loop the person is in:
- **rumination**: Replaying a past event, stuck in "what happened" or "what I should have done"
- **anticipatory**: Future-focused worry, catastrophizing what might happen
- **decisional**: Stuck between options, paralyzed by what-ifs
- **self-critical**: Inner critic loop, harsh self-judgment, shame spiral
- **relational**: Anxiety about what others think, reading into social signals
- **existential**: Questioning meaning, purpose, identity, or direction

## FACT vs. ASSUMPTION
This is the most important analytical move. Overthinkers treat assumptions as facts. Your job is to gently separate:
- **Known**: Things that are directly observable or confirmed ("My boss didn't reply to my email")
- **Assumed**: Interpretations, predictions, or mind-reading ("She must be upset with me")

## INTENSITY READING
Gauge emotional intensity on two scales:

Label (for display):
- **low**: Reflective, curious, processing calmly
- **moderate**: Some distress, circular thinking, but still grounded
- **high**: Spiraling, catastrophizing, strong emotional charge, urgency

Numeric score (for graphing trends over time) — 0 to 5:
- **0 (none)**: Neutral check-in, no emotional charge
- **1 (mild)**: Slight unease, gentle curiosity, low-stakes processing
- **2 (moderate)**: Noticeable worry or frustration, some circular thinking
- **3 (elevated)**: Clear distress, repetitive thoughts, difficulty letting go
- **4 (high)**: Spiraling, catastrophizing, strong emotional flooding
- **5 (severe)**: Crisis-level overwhelm, panic, inability to function

Be precise with scores. Most everyday entries should land between 1-3. Reserve 4-5 for genuine spirals.

## PATTERN DETECTION
When history is available, look for:
- Recurring triggers (time of day, specific people, situations)
- Emotional cycles (does this theme come and go?)
- Growth signals (is the person handling this differently than before?)

## TEMPORAL SHIFT
If the person is stuck in the past or future, note it:
- "You're replaying a conversation from yesterday as if you could change the outcome"
- "You're rehearsing a future confrontation that may never happen"
- null if they're present-focused

## TAGS
Assign 1-3 UPPERCASE tags from this taxonomy (use exactly these when applicable):
AMBIGUITY, REJECTION, SELF-DOUBT, CONTROL, DECISION PARALYSIS, SAFETY, VALIDATION, OVERWHELM, SHAME, LONELINESS, AVOIDANCE, REASSURANCE, ATTACHMENT, STUCKNESS, LONGING, WORK ANXIETY, PERFECTIONISM, PEOPLE-PLEASING, BOUNDARIES, IMPOSTER, COMPARISON, BURNOUT, GRIEF, IDENTITY, CHANGE

## OUTPUT FORMAT
Return ONLY a valid JSON object with these exact fields:
{
  "mainLoop": "A 1-2 sentence description of the specific cognitive loop, written in second person. Be precise, not generic.",
  "loopType": "rumination" | "anticipatory" | "decisional" | "self-critical" | "relational" | "existential",
  "feelings": ["2-4 specific emotions — prefer precise words like 'dread' over vague ones like 'bad'"],
  "intensity": "low" | "moderate" | "high",
  "intensityScore": <0-5 integer matching the numeric scale above>,
  "knownVsAssumed": {
    "known": ["1-2 factual observations from what they said"],
    "assumed": ["1-2 interpretations or predictions they're treating as fact"]
  },
  "repeatingPattern": "If you see a pattern from their history, describe it in 1 sentence. Otherwise null.",
  "temporalShift": "If they're stuck in past or future, name it in 1 sentence. Otherwise null.",
  "oneQuestion": "A single reflective question that could crack the loop open. Not generic. Specific to what they said.",
  "nextStep": "One concrete grounding micro-action (not advice, not 'talk to someone'). Something they can do in the next 60 seconds.",
  "tags": ["1-3 UPPERCASE tags from the taxonomy above"]
}

Return ONLY valid JSON. No markdown fences, no explanation, no preamble.${historyContext}${conversationContext}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { userId, adminClient } = await authenticateRequest(req);

    const { content, entryType, previousMessages, imageUrl } = await req.json();
    if (!content?.trim() && !imageUrl) {
      return errorResponse(req, "Content or image required", 400);
    }

    // Fetch recent entries for pattern detection
    const { data: recentEntries } = await adminClient
      .from("entries")
      .select("content, reflection, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15);

    // Build richer history context with temporal markers
    let historyContext = "";
    if (recentEntries?.length) {
      const now = new Date();
      const enriched = recentEntries.map((e: any) => {
        const age = Math.round(
          (now.getTime() - new Date(e.created_at).getTime()) / (1000 * 60 * 60)
        );
        const timeLabel =
          age < 1 ? "just now" :
          age < 24 ? `${age}h ago` :
          age < 168 ? `${Math.round(age / 24)}d ago` :
          `${Math.round(age / 168)}w ago`;

        const reflection = e.reflection || {};
        const loopType = reflection.loopType || "unknown";
        const intensity = reflection.intensity || "unknown";

        return `- [${timeLabel}] "${e.content.substring(0, 250)}" | loop: ${loopType} | intensity: ${intensity} | tags: ${(e.tags || []).join(", ")}`;
      });

      historyContext = `\n\n## PREVIOUS ENTRIES (most recent first — use for pattern detection)\n${enriched.join("\n")}`;
    }

    // Build conversation context for multi-turn sessions
    let conversationContext = "";
    if (previousMessages?.length) {
      const messages = previousMessages.slice(-6); // Keep last 6 turns max
      conversationContext = `\n\n## CURRENT SESSION CONVERSATION\n${messages
        .map((m: any) => `${m.role === "user" ? "User" : "Loop"}: ${m.content.substring(0, 400)}`)
        .join("\n")}`;
    }

    const systemPrompt = buildSystemPrompt(historyContext, conversationContext);

    // Build the user message — text-only or multimodal with image
    const userContent = imageUrl
      ? [
          ...(content?.trim()
            ? [{ type: "text" as const, text: content }]
            : [{ type: "text" as const, text: "Please look at this image and reflect on what you see. Extract any text if present, and identify the emotional or cognitive themes." }]),
          { type: "image_url" as const, image_url: { url: imageUrl } },
        ]
      : content;

    const reflection = await chatCompletionJSON<Reflection>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      { ...REFLECTION_FALLBACK, mainLoop: (content || "Image reflection").substring(0, 200) },
      { temperature: 0.4, maxTokens: 1024 }
    );

    // Validate and normalize tags
    reflection.tags = (reflection.tags || []).map((t: string) =>
      t.toUpperCase().trim()
    );

    // Normalize intensityScore to 0-5 integer
    const raw = Number(reflection.intensityScore);
    reflection.intensityScore = Number.isFinite(raw)
      ? Math.max(0, Math.min(5, Math.round(raw)))
      : 2;

    // Ensure required fields exist
    if (!reflection.mainLoop) reflection.mainLoop = "Processing your thought...";
    if (!reflection.feelings?.length) reflection.feelings = ["uncertain"];
    if (!reflection.knownVsAssumed) {
      reflection.knownVsAssumed = { known: [], assumed: [] };
    }

    // Store entry
    const { data: entry, error: insertError } = await adminClient
      .from("entries")
      .insert({
        user_id: userId,
        entry_type: imageUrl ? "image" : (entryType || "text"),
        content: content || "[Image]",
        reflection,
        tags: reflection.tags,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return jsonResponse(req, { reflection, entryId: entry?.id });
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(req, e.message, e.status);
    }
    if (e instanceof AIError) {
      return errorResponse(req, e.message, e.status);
    }
    console.error("reflect error:", e);
    return errorResponse(
      req,
      e instanceof Error ? e.message : "Unknown error"
    );
  }
});
