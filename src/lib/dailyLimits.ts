/**
 * Client-side daily usage limits — soft enforcement layer.
 *
 * The real enforcement happens server-side in edge functions. This module
 * provides a way for the UI to show on-brand messages and disable controls
 * BEFORE the user hits the server-side 429.
 *
 * On-brand copy (Loop Mind voice: warm, observational, not punitive).
 */

export type UsageAction =
  | "entries_count"
  | "chat_messages_count"
  | "explorations_count"
  | "image_uploads_count";

export const DAILY_LIMITS: Record<UsageAction, number> = {
  entries_count: 20,
  chat_messages_count: 50,
  explorations_count: 20,
  image_uploads_count: 10,
};

export const LIMIT_MESSAGES: Record<UsageAction, string> = {
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
 * Check if a 429 error from an edge function is a daily limit hit.
 * Edge functions return the limit message in the error body.
 */
export function isDailyLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg =
    (error as any)?.message ||
    (error as any)?.context?.message ||
    "";
  return Object.values(LIMIT_MESSAGES).some((lm) => msg.includes(lm));
}
