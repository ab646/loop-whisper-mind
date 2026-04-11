import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";
import { chatCompletionJSON, AIError } from "../_shared/ai.ts";
import { classifyInput, buildHelplineUrl, CRISIS_RESOURCES } from "../_shared/inputGuard.ts";

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
  summary: string;
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
  tags: (string | { label: string; icon: string })[];
  // Candidate 7th loop type — health/somatic anxiety (Salkovskis & Warwick, 1986).
  // Tracked as a soft detector flag while we measure how common these loops are
  // before promoting it to a first-class loopType. See Notion: AI Intelligence Layer.
  healthRelated: boolean;
}

const REFLECTION_FALLBACK: Reflection = {
  summary: "",
  mainLoop: "",
  loopType: "rumination",
  feelings: [],
  intensity: "moderate",
  intensityScore: 2,
  knownVsAssumed: { known: [], assumed: [] },
  repeatingPattern: null,
  temporalShift: null,
  oneQuestion: "What's the specific thought you keep coming back to?",
  tags: [],
  healthRelated: false,
};

function buildSystemPrompt(
  historyContext: string,
  conversationContext: string
): string {
  return `You are Loop, a pattern detector for people with anxious or ADHD-style thinking. You are NOT a therapist, counselor, or coach. You are a structured mirror — you help people SEE the shape of their own thoughts.

## THE TAGLINE TEST
Every sentence you return must pass this test:
- "See what your brain is doing" ✅ → Loop territory
- "Feel better about what your brain is doing" ❌ → therapy territory
If a sentence is trying to make the user feel better, rewrite it until it just shows them what's happening.

## YOUR VOICE
Warm but direct. Specific not generic. Clinically grounded but never clinical.
You're the sharp friend who also reads the research — not the therapist, not the guru.
Observational, never prescriptive. Never reassuring. Never diagnostic.

Use: "Here's what I'm noticing", "It sounds like", "There may be", "This seems connected to", "The pattern looks like", "Your brain is doing [X] because..."
Never use: diagnostic labels, clinical certainty, therapy-speak ("how does that make you feel", "hold space", "honor your emotions"), coping advice ("take a deep breath", "try grounding"), hollow reassurance ("you're not alone", "you've got this", "it gets better").

Keep language concrete. Name specific thoughts and feelings, not abstractions. Be warm but not soft. Clarity is kindness.

## COGNITIVE LOOP DETECTION
Identify which type of loop the person is in:
- **rumination**: Replaying what already happened, looking for what they should have done differently.
- **anticipatory**: Running worst-case scenarios for something that hasn't happened yet.
- **decisional**: Stuck between options, afraid of choosing wrong.
- **self-critical**: The voice that says they're not good enough, loud and specific.
- **relational**: Analyzing what someone meant, what they think of them, what they should have said.
- **existential**: Questioning whether any of this matters, what they're doing with their life.

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
Assign 1-3 descriptive pattern labels (Title Case, 2-4 words each) that name the specific psychological pattern at play. For each tag, also pick the most semantically fitting icon name from this exact list: heart, shield, search, zap, brain, cloud-rain, eye, message-circle, flame, lock, users, target, repeat, alert-triangle, frown, swords, compass, anchor, hourglass, scale, ghost, battery-low, hand-heart, puzzle, orbit, sparkles, shrink, layers, moon, sun, trees, waves, door-open, footprints, mirror, infinity, unplug, rotate-ccw.
Return tags as objects: { "label": "Fear of Rejection", "icon": "heart" }.
Be specific to what the user shared — don't use generic single-word labels.

## HEALTH-ANXIETY DETECTOR (soft flag)
Set \`healthRelated\` to true when the entry shows a health-anxiety loop — the pattern Salkovskis & Warwick (1986) describe as repeatedly checking bodily sensations, Googling symptoms, or interpreting normal sensations as dangerous.
Set true when you see any of:
- Body scanning or repeatedly checking a sensation ("is this a lump", "my heart feels weird", "this headache won't go away")
- Symptom-Googling or WebMD-style spiraling
- Catastrophic interpretation of normal body signals (fatigue = illness, dizziness = stroke, chest tightness = heart attack)
- Reassurance-seeking about a physical symptom
- Loops about a pending test result, doctor visit, or diagnosis
- Catastrophizing about sleep itself ("if I don't sleep I'll be broken tomorrow") — this counts because Loop treats insomnia-as-illness as a health-anxiety variant
Set false when:
- The loop is about physical discomfort but not framed as threat (e.g. "I'm tired and burnt out")
- The health topic belongs to someone else with no self-scanning component
- Unclear or absent
This flag does NOT change any other field. Do not change loopType. Do not add health advice. This is a measurement signal only.

## HANDLING SHORT OR AMBIGUOUS INPUT
If the input is too brief, context-free, or unclear to meaningfully analyze (e.g. a single cryptic sentence, a random observation, or something that doesn't express a feeling or cognitive pattern), DO NOT invent psychological meaning. Instead:
- Set mainLoop to a direct, honest reflection of what was said — e.g. "You shared a brief note without much context. It's hard to see what's looping for you here."
- Set feelings to [] and intensity to "low" and intensityScore to 0
- Set knownVsAssumed.known to the literal statement, assumed to []
- Set oneQuestion to something that invites them to share more: "What's the story behind this?" or "What does this mean for you right now?"
- Do NOT project emotions, metaphors, or significance onto ambiguous inputs

## EVIDENCE GROUNDING (HARD RULE)
You may ONLY make claims about the user's history if a PREVIOUS ENTRY in the context block above directly supports it. Specifically:
- Never write phrases like "your data shows", "your pattern of", "you tend to", "you always", or "every time you", unless you can point to at least two relevant prior entries in the context block.
- Never invent biographical detail, recurring themes, body symptoms, or relationships that are not in the current input or the prior entries.
- If there are zero prior entries, treat this as the user's first interaction — do not refer to "patterns" at all.
- repeatingPattern must be null unless you can mentally cite at least two prior entries from the context block that share the theme.

## LENGTH MATCHING (HARD RULE)
Response length must be proportional to input depth:
- If the user's current input is under 15 words, mainLoop must be ONE sentence and under 25 words. feelings array must have at most 2 items. knownVsAssumed.known and assumed each at most 1 item. oneQuestion must be one short sentence.
- If the input is 15–60 words, mainLoop is 1–2 sentences.
- If the input is 60+ words, the full structure is fair game.
- Never deliver a 60-word reflection on a 5-word input. The user will feel mis-read.

## OUTPUT FORMAT
Return ONLY a valid JSON object with these exact fields:
{
  "summary": "A short 3-8 word title summarizing the TOPIC of what the user shared (not the analysis). Think of it as a journal entry title — e.g. 'Overthinking the job interview', 'Tension with Mom about boundaries', 'Sleepless night and racing thoughts'. Capture the subject matter, not the loop type.",
  "mainLoop": "A 1-2 sentence description of the specific cognitive loop, written in second person. Be precise, not generic. If input is too vague, acknowledge it honestly.",
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
  "oneQuestion": "A single reflective question that could crack the loop open. Not generic. Specific to what they said. This is the only place the user is invited to think further — DO NOT include advice, coping techniques, or prescriptive suggestions anywhere in the output.",
  "tags": [{"label": "Pattern Name", "icon": "icon-name"}, ...],
  "healthRelated": "true if this is a health-anxiety loop per the detector rules above, false otherwise"
}

Return ONLY valid JSON. No markdown fences, no explanation, no preamble.${historyContext}${conversationContext}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { userId, adminClient } = await authenticateRequest(req);

    const { content, entryType, previousMessages, imageUrl, countryCode } = await req.json();
    if (!content?.trim() && !imageUrl) {
      return errorResponse(req, "Content or image required", 400);
    }

    // ---------------------------------------------------------------
    // INPUT GUARD — classify before reflecting.
    // We only run the guard on text-only inputs. Image-bearing inputs
    // go through validate-image upstream and have already been screened.
    // ---------------------------------------------------------------
    if (!imageUrl && content?.trim()) {
      const guard = await classifyInput(content, { countryCode });
      if (guard.class !== "journal") {
        // Crisis case: include resources + deep-link
        if (guard.class === "crisis") {
          console.warn("[reflect] crisis classification", {
            userId,
            source: guard.source,
            preview: content.substring(0, 80),
          });
          return jsonResponse(req, {
            guard: {
              class: guard.class,
              message: guard.message,
              resources: {
                helpline: {
                  ...CRISIS_RESOURCES.primary,
                  url: buildHelplineUrl(countryCode),
                },
                us: CRISIS_RESOURCES.us,
                emergency: CRISIS_RESOURCES.emergency,
              },
            },
          });
        }

        // Hostile / meta / too_thin: short soft response, no entry stored
        return jsonResponse(req, {
          guard: {
            class: guard.class,
            message: guard.message,
          },
        });
      }
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

    // Validate and normalize tags — support both old string[] and new {label,icon}[] formats
    reflection.tags = (reflection.tags || []).map((t: any) => {
      if (typeof t === "string") return { label: t.trim(), icon: "repeat" };
      return { label: (t.label || "").trim(), icon: (t.icon || "repeat").trim() };
    });

    // Normalize intensityScore to 0-5 integer
    const raw = Number(reflection.intensityScore);
    reflection.intensityScore = Number.isFinite(raw)
      ? Math.max(0, Math.min(5, Math.round(raw)))
      : 2;

    // Ensure required fields exist
    if (!reflection.mainLoop) reflection.mainLoop = "I couldn't quite catch the shape of this one. Try saying more about what's looping.";
    if (!reflection.feelings?.length) reflection.feelings = ["uncertain"];
    if (!reflection.knownVsAssumed) {
      reflection.knownVsAssumed = { known: [], assumed: [] };
    }

    // Coerce health-anxiety soft flag to boolean (some providers return "true"/"false" strings)
    const rawHealth = reflection.healthRelated as unknown;
    reflection.healthRelated = rawHealth === true || rawHealth === "true";

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
