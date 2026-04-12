/**
 * Persistent daily usage limits — cost protection for AI-backed endpoints.
 *
 * Unlike rateLimit.ts (in-memory, per-minute), this module checks a
 * Supabase `usage_counters` table for daily totals. Limits are generous
 * enough that normal users never hit them — they exist to cap cost
 * exposure from abuse or bugs.
 *
 * See Notion: "Usage & Abuse Limits — Product Spec"
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2.101.1";

/** Column names in usage_counters that can be incremented */
export type UsageAction =
  | "entries_count"
  | "chat_messages_count"
  | "explorations_count"
  | "image_uploads_count";

/** Daily ceilings — raise these if legitimate users regularly hit them */
const DAILY_LIMITS: Record<UsageAction, number> = {
  entries_count: 20,
  chat_messages_count: 50,
  explorations_count: 20,
  image_uploads_count: 10,
};

/** User-facing messages when a limit is hit (Loop Mind voice: warm, observational, not punitive) */
const LIMIT_MESSAGES: Record<UsageAction, string> = {
  entries_count:
    "You've been in your head a lot today. Loop will be here tomorrow.",
  chat_messages_count:
    "That's a lot of thinking for one day. Come back tomorrow — Loop's not going anywhere.",
  explorations_count:
    "You've dug into a lot today. More tomorrow.",
  image_uploads_count:
    "That's enough images for today — your entries are saved.",
};

/**
 * Check whether a user has hit their daily limit for a given action.
 * If not, atomically increment the counter. Uses upsert so the first
 * call of the day creates the row.
 *
 * @returns `null` if under the limit (counter was incremented),
 *          or a `{ message, limit }` object if the limit is reached.
 */
export async function checkAndIncrementDailyLimit(
  adminClient: SupabaseClient,
  userId: string,
  action: UsageAction
): Promise<{ message: string; limit: number } | null> {
  const today = new Date().toISOString().slice(0, 10); // UTC date
  const limit = DAILY_LIMITS[action];

  // Fetch current count (or null if no row yet)
  const { data: row } = await adminClient
    .from("usage_counters")
    .select(action)
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const currentCount: number = row?.[action] ?? 0;

  if (currentCount >= limit) {
    return { message: LIMIT_MESSAGES[action], limit };
  }

  // Upsert: increment the counter (or create today's row)
  await adminClient.from("usage_counters").upsert(
    {
      user_id: userId,
      date: today,
      [action]: currentCount + 1,
    },
    { onConflict: "user_id,date" }
  );

  return null;
}

/**
 * Read current daily usage for a user (all counters).
 * Used by the client-side hook to show remaining quota.
 */
export async function getDailyUsage(
  adminClient: SupabaseClient,
  userId: string
): Promise<Record<UsageAction, { used: number; limit: number }>> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: row } = await adminClient
    .from("usage_counters")
    .select("entries_count, chat_messages_count, explorations_count, image_uploads_count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const result = {} as Record<UsageAction, { used: number; limit: number }>;
  for (const [action, limit] of Object.entries(DAILY_LIMITS)) {
    result[action as UsageAction] = {
      used: row?.[action] ?? 0,
      limit,
    };
  }
  return result;
}
