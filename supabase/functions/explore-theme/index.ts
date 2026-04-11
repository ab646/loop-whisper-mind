import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";
import { chatCompletionJSON, AIError } from "../_shared/ai.ts";
import { classifyInput, buildHelplineUrl, CRISIS_RESOURCES } from "../_shared/inputGuard.ts";

/**
 * Loop Theme Explorer
 *
 * Deep-dives into a single recurring theme from the user's entries.
 * Unlike insights (which gives a bird's-eye view), this function
 * zooms into one pattern and traces it: what beliefs fuel it,
 * what triggers it, how it's evolved, and what questions could
 * help the user see it differently.
 *
 * Also supports follow-up questions where the user can "talk to"
 * a theme — asking Loop to explain connections they're curious about.
 */

interface ThemeAnalysis {
  connectedBelief: string;
  beliefTags: string[];
  triggers: Array<{
    label: string;
    iconType: string;
  }>;
  entriesThisWeek: number;
  timeline: string;
  patternInsight: string;
  protectiveFunction: string | null;
  followUpQuestions: string[];
  answer: string | null;
}

const THEME_FALLBACK: ThemeAnalysis = {
  connectedBelief: "",
  beliefTags: [],
  triggers: [],
  entriesThisWeek: 0,
  timeline: "",
  patternInsight: "",
  protectiveFunction: null,
  followUpQuestions: [],
  answer: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { userId, adminClient } = await authenticateRequest(req);

    const { theme, question, countryCode } = await req.json();
    if (!theme) return errorResponse(req, "Theme required", 400);

    // ---------------------------------------------------------------
    // INPUT GUARD — follow-up questions only.
    //
    // A follow-up like "what should I do?" is NOT fresh journal content.
    // It's a short question about the theme/entry we're already exploring,
    // so the classifier's `too_thin` and `meta_or_scope` classes don't
    // apply here — they'd incorrectly reject legitimate follow-ups with
    // "Not enough here to see what's looping."
    //
    // We still gate on `crisis` (safety) and `hostile` (abuse). Everything
    // else falls through to the theme analyzer, which has the full context
    // of the theme + entries to ground its answer.
    // ---------------------------------------------------------------
    if (question?.trim()) {
      const guard = await classifyInput(question, { countryCode });

      if (guard.class === "crisis") {
        console.warn("[explore-theme] crisis classification", {
          userId,
          source: guard.source,
          preview: question.substring(0, 80),
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

      if (guard.class === "hostile") {
        return jsonResponse(req, {
          guard: {
            class: guard.class,
            message: guard.message,
          },
        });
      }

      // too_thin / meta_or_scope / journal → proceed. The theme analyzer
      // grounds the answer in the existing theme + entries context.
    }

    const normalizedTheme = theme.trim();
    const themeLC = normalizedTheme.toLowerCase();

    // Fetch all user entries — tags may be strings or {label,icon} objects,
    // so we filter in code rather than using `contains`.
    const { data: rawEntries } = await adminClient
      .from("entries")
      .select("content, reflection, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const allEntries = rawEntries || [];

    // Filter entries matching this theme (case-insensitive, supports both formats)
    const matchedEntries = allEntries.filter((e: any) =>
      (e.tags || []).some((t: any) => {
        const label = typeof t === "string" ? t : t?.label || "";
        return label.toLowerCase().includes(themeLC);
      })
    );

    const now = new Date();

    const themeEntries = matchedEntries
      .map((e: any) => {
        const ageHours =
          (now.getTime() - new Date(e.created_at).getTime()) / (1000 * 60 * 60);
        const timeLabel =
          ageHours < 24 ? "today" :
          ageHours < 168 ? `${Math.round(ageHours / 24)}d ago` :
          `${Math.round(ageHours / 168)}w ago`;

        const reflection = e.reflection || {};
        return `[${timeLabel}] "${e.content.substring(0, 300)}" | loop: ${reflection.loopType || "?"} | intensity: ${reflection.intensity || "?"} | feelings: ${(reflection.feelings || []).join(", ")}`;
      })
      .join("\n");

    const matchedSet = new Set(matchedEntries.map((e: any) => e.created_at));
    const otherEntries = allEntries
      .filter((e: any) => !matchedSet.has(e.created_at))
      .slice(0, 10)
      .map(
        (e: any) =>
          `[${new Date(e.created_at).toLocaleDateString()}] tags: ${(e.tags || []).join(", ")} | "${e.content.substring(0, 100)}"`
      )
      .join("\n");

    // Use allEntries for week count since theme names are AI-generated
    // and may not match stored tags exactly
    const weekCount = allEntries.filter((e: any) => {
      const age = (now.getTime() - new Date(e.created_at).getTime()) / (1000 * 60 * 60);
      return age < 168;
    }).length;

    const systemPrompt = `You are Loop's theme analyst. The user wants to understand their recurring "${normalizedTheme}" pattern at a deeper level. You are psychologically literate but NOT a therapist. Your job is to help them see the architecture of this pattern.

## WHAT TO ANALYZE
1. **Core belief**: What underlying belief drives this theme? Write it as something the user might say to themselves (e.g., "If I don't get this right, people will see I'm not good enough")
2. **Triggers**: What specific situations or contexts activate this pattern?
3. **Timeline**: Has this theme intensified, softened, or stayed constant? Any notable shifts?
4. **Protective function**: Many recurring loops serve an unconscious purpose (e.g., perfectionism protects against criticism; avoidance protects against rejection). If you can identify one, name it. This is one of the most valuable insights you can offer.
5. **Cross-theme connections**: Does this theme appear alongside other tags? What does that combination suggest?

## EVIDENCE GROUNDING (HARD RULE)
Every claim about the user must trace to an entry in the data block above. Specifically:
- Never write "your data shows", "you tend to", "you always", "every time you", or any pattern claim unless at least two entries above support it.
- Never invent biographical details, relationships, or symptoms not present in the entries.
- If only 0–1 entries exist for this theme, mark patternInsight as a tentative observation about THIS entry only, not a pattern.
- protectiveFunction may be null if you cannot identify one — do not invent.

${question ? `## USER'S QUESTION\nThe user specifically asked: "${question}"\nAnswer this thoughtfully based on their data. Be specific, not generic. If their data does not contain enough evidence to answer, say so plainly rather than fabricating.` : "## MODE\nProvide a deep unprompted analysis of this theme."}

## OUTPUT FORMAT
Return ONLY a valid JSON object:
{
  "connectedBelief": "The core belief driving this pattern, written as an inner-voice quote (1-2 sentences)",
  "beliefTags": ["1-2 psychological labels like 'Safety-seeking', 'Control', 'Perfectionism', 'Attachment anxiety', 'Avoidance'"],
  "triggers": [{"label": "Specific trigger", "iconType": "heart"|"heart-crack"|"brain"|"users"|"clock"|"message-circle"|"briefcase"|"shield"|"eye"|"flame"|"cloud-rain"|"zap"|"target"|"lock"|"phone"|"moon"|"battery-low"|"scale"|"hand-heart"|"ghost"|"volume-x"|"compass"|"hourglass"|"alarm-clock"}] (top 3, pick the icon that BEST represents the trigger's essence),
  "entriesThisWeek": ${weekCount},
  "timeline": "1-2 sentences about how this theme has evolved over the entries. Reference specific shifts if visible.",
  "patternInsight": "Your most valuable observation about this pattern — something the user likely hasn't noticed. 1-2 sentences. Be specific.",
  "protectiveFunction": "What purpose might this loop serve? e.g., 'This worry pattern may be your mind's way of preparing for the worst so you're never caught off guard.' null if you can't identify one.",
  "followUpQuestions": ["3 broad, curiosity-sparking questions (max 10 words each). These are NOT about the specific entries — they zoom OUT to a bigger-picture angle the user hasn't considered. Think lifestyle, relationships, energy, environment, timing, or self-perception. BAD: 'Why do you feel rejected when friends cancel?' (too specific, references exact entries). GOOD: 'How does your energy level shape this pattern?', 'What role does timing play here?', 'Is this pattern different around certain people?' Never reference specific journal content, names, or situations. The question should feel like a magazine headline — universally relatable yet personally resonant."],
  "answer": ${question ? '"A thoughtful 2-3 sentence answer to their question, grounded in their actual data"' : "null"}
}

Return ONLY valid JSON. No markdown, no explanation.`;

    const analysis = await chatCompletionJSON<ThemeAnalysis>(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
      content: `Theme: ${normalizedTheme}\n\nEntries with this tag (${matchedEntries.length} total, ${weekCount} this week):\n${themeEntries || "No entries yet"}\n\nOther recent entries for cross-reference:\n${otherEntries || "None"}`,
        },
      ],
      THEME_FALLBACK,
      { temperature: 0.4, maxTokens: 1536 }
    );

    analysis.entriesThisWeek = weekCount;

    // Build frequency + intensity timeline from ALL entries (theme names from
    // insights are AI-generated and don't always match stored tags exactly)
    const dayMap: Record<string, { count: number; intensitySum: number }> = {};

    for (const e of allEntries) {
      const day = new Date(e.created_at).toISOString().split("T")[0];
      const reflection = (e.reflection || {}) as Record<string, any>;
      const oldMap: Record<string, number> = { low: 1, moderate: 3, high: 5 };
      const score = typeof reflection.intensityScore === "number"
        ? Math.max(0, Math.min(5, reflection.intensityScore))
        : (oldMap[reflection.intensity as string] ?? 2);
      if (!dayMap[day]) dayMap[day] = { count: 0, intensitySum: 0 };
      dayMap[day].count += 1;
      dayMap[day].intensitySum += score;
    }

    const dates = Object.keys(dayMap).sort();
    const frequencyData: Array<{ date: string; count: number; intensity: number }> = [];
    if (dates.length > 0) {
      const start = new Date(dates[0]);
      const end = new Date(dates[dates.length - 1]);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        const bucket = dayMap[key];
        frequencyData.push({
          date: key,
          count: bucket?.count || 0,
          intensity: bucket ? Math.round((bucket.intensitySum / bucket.count) * 10) / 10 : 0,
        });
      }
    }

    return jsonResponse(req, { ...analysis, frequencyData });
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(req, e.message, e.status);
    if (e instanceof AIError) return errorResponse(req, e.message, e.status);
    console.error("explore-theme error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Unknown error");
  }
});
