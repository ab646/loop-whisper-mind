/**
 * Simple client-side rate limiter to prevent auth endpoint abuse.
 * Not a security boundary (server-side is), but reduces accidental
 * brute-force from the UI and gives users clear feedback.
 */

const attempts = new Map<string, number[]>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS: Record<string, number> = {
  "auth:signin": 5,
  "auth:signup": 3,
  "auth:resend": 2,
  "auth:reset": 3,
};

export function checkRateLimit(action: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const max = MAX_ATTEMPTS[action] ?? 5;
  const history = (attempts.get(action) ?? []).filter((t) => now - t < WINDOW_MS);

  if (history.length >= max) {
    const oldest = history[0];
    const retryAfterSec = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  history.push(now);
  attempts.set(action, history);
  return { allowed: true, retryAfterSec: 0 };
}
