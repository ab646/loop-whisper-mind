import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";
import { chatCompletionJSON, AIError } from "../_shared/ai.ts";
import { isUserRateLimited } from "../_shared/rateLimit.ts";

/**
 * Loop Insights Engine
 *
 * Aggregates a user's entries over time and detects patterns:
 * recurring themes, common triggers, fact-vs-assumption ratios,
 * temporal trends (getting better/worse), and growth signals.
 *
 * Unlike reflect (which mirrors one thought), insights looks
 * across weeks of data to surface what the user can't see from
 * inside the loop.
 */

interface Insights {
  themes: Array<{
    name: string;
    mentions: number;
    trend: "rising" | "stable" | "declining";
    icon: string;
  }>;
  triggers: Array<{
    label: string;
    detail: string;
    iconType: string;
  }>;
  factPercent: number;
  factExample: string;
  assumptionExample: string;
  weeklyInsight: string;
  improvementNote: string;
  timePatterns: string | null;
}

const INSIGHTS_FALLBACK: Insights = {
  themes: [],
  triggers: [],
  factPercent: 50,
  factExample: "",
  assumptionExample: "",
  weeklyInsight: "",
  improvementNote: "",
  timePatterns: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { userId, adminClient } = await authenticateRequest(req);

    if (isUserRateLimited(userId, "insights", 10)) {
      return errorResponse(req, "Too many requests. Try again in a minute.", 429);
    }

    // Fetch entries with a wider window for trend detection
    const { data: entries } = await adminClient
      .from("entries")
      .select("content, reflection, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!entries?.length) {
      return jsonResponse(req, {
        ...INSIGHTS_FALLBACK,
        isEmpty: true,
      });
    }

    // Enrich entries with temporal context
    const now = new Date();
    const thisWeek: typeof entries = [];
    const lastWeek: typeof entries = [];
    const older: typeof entries = [];

    for (const e of entries) {
      const ageHours =
        (now.getTime() - new Date(e.created_at).getTime()) / (1000 * 60 * 60);
      if (ageHours < 168) thisWeek.push(e);
      else if (ageHours < 336) lastWeek.push(e);
      else older.push(e);
    }

    const formatEntry = (e: any, bucket: string) => {
      const reflection = e.reflection || {};
      const loopType = reflection.loopType || "";
      const intensity = reflection.intensity || "";
      const feelings = (reflection.feelings || []).join(", ");
      const knownCount = (reflection.knownVsAssumed?.known || []).length;
      const assumedCount = (reflection.knownVsAssumed?.assumed || []).length;

      return `[${bucket}|${new Date(e.created_at).toLocaleDateString()}] "${e.content.substring(0, 200)}" | loop: ${loopType} | intensity: ${intensity} | feelings: ${feelings} | facts: ${knownCount}, assumptions: ${assumedCount} | tags: ${(e.tags || []).join(", ")}`;
    };

    const entrySummaries = [
      ...thisWeek.map((e) => formatEntry(e, "THIS_WEEK")),
      ...lastWeek.map((e) => formatEntry(e, "LAST_WEEK")),
      ...older.map((e) => formatEntry(e, "OLDER")),
    ].join("\n");

    const systemPrompt = `You analyze a person's journal entries to detect emotional and cognitive patterns over time. You are psychologically literate but NOT a therapist. Your job is to surface patterns the person can't see from inside their own loops.

## ANALYSIS PRIORITIES
1. **Temporal trends**: Are themes getting more or less frequent? Is intensity rising or falling? Note what's CHANGING, not just what exists.
2. **Trigger detection**: What situations, times, or contexts precede high-intensity entries? Look for correlations.
3. **Fact vs. assumption ratio**: Across all entries, roughly what percentage of the user's concerns are grounded in observable facts vs. assumptions/predictions?
4. **Growth signals**: Any evidence the person is handling recurring themes differently than before? Even subtle shifts matter.
5. **Time-of-day or day-of-week patterns**: Do entries cluster at certain times?

## TREND CLASSIFICATION
For each theme:
- **rising**: More frequent or more intense in THIS_WEEK vs LAST_WEEK/OLDER
- **stable**: Consistent presence
- **declining**: Less frequent or less intense recently

## OUTPUT FORMAT
Return ONLY a valid JSON object:
{
  "themes": [
    {"name": "Theme Name", "mentions": <count>, "trend": "rising"|"stable"|"declining", "icon": "<pick the SINGLE most fitting icon from this list: cloud, cloud-rain, heart, heart-crack, briefcase, brain, shield, users, user-x, home, clock, flame, target, eye, zap, compass, leaf, moon, sun, ghost, message-circle, trending-up, lock, lightbulb, frown, battery-low, alert-circle, help-circle>"}
  ] (top 4-6 themes, sorted by current relevance not just count),
  "triggers": [
    {"label": "Trigger description", "detail": "Brief correlation note", "iconType": "<pick the SINGLE most fitting icon from: message-circle, mail, volume-x, calendar, clock, users, flame, heart, briefcase, home, brain, shield, eye, compass, target, zap, ghost, lock, phone, moon, battery-low, alert-circle>"}
  ] (top 3 triggers),
  "factPercent": <0-100, percentage of concerns grounded in fact vs assumption across all entries>,
  "factExample": "A representative factual observation from their entries",
  "assumptionExample": "A representative assumption they treated as fact",
  "weeklyInsight": "2-3 sentences about the dominant emotional patterns THIS period. Be specific — reference actual themes and how they've shifted. Warm but not soft.",
  "improvementNote": "1 sentence about a positive trend, growth signal, or new coping pattern. If none, acknowledge the difficulty without false positivity.",
  "timePatterns": "1 sentence about when entries tend to cluster (e.g., 'Most entries happen late at night, which often correlates with higher intensity'). null if insufficient data."
}

Return ONLY valid JSON. No markdown, no explanation.`;

    const insights = await chatCompletionJSON<Insights>(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze these ${entries.length} journal entries (${thisWeek.length} this week, ${lastWeek.length} last week, ${older.length} older):\n\n${entrySummaries}`,
        },
      ],
      INSIGHTS_FALLBACK,
      { temperature: 0.3, maxTokens: 1536 }
    );

    return jsonResponse(req, insights);
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(req, e.message, e.status);
    if (e instanceof AIError) return errorResponse(req, e.message, e.status);
    console.error("insights error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Unknown error");
  }
});
