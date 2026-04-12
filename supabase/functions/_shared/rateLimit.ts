/**
 * SEC-26: In-memory per-user rate limiter for authenticated edge functions.
 * Prevents cost abuse by limiting how often a user can call AI-backed endpoints.
 *
 * NOTE: In-memory state doesn't persist across function cold starts or instances.
 * This is a best-effort defense, not a hard guarantee. For stronger enforcement,
 * move to a persistent store (e.g., Supabase table or Redis).
 */

const windowMs = 60_000; // 1 minute window
const userMap = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userMap) {
    if (now > entry.resetAt) userMap.delete(key);
  }
}, 120_000);

/**
 * Check if a user has exceeded the rate limit for a given action.
 * @param userId - authenticated user ID
 * @param action - function name (e.g., "reflect", "insights")
 * @param maxPerMinute - max calls per minute (default: 20)
 * @returns true if rate limited
 */
export function isUserRateLimited(
  userId: string,
  action: string,
  maxPerMinute: number = 20
): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = userMap.get(key);

  if (!entry || now > entry.resetAt) {
    userMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > maxPerMinute;
}
