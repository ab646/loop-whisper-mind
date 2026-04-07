type PendingChatPrefill = {
  autoSubmit?: boolean;
  createdAt: number;
  prefillText?: string;
};

const PENDING_CHAT_PREFILL_KEY = "loop.pending-chat-prefill";
const PENDING_CHAT_PREFILL_MAX_AGE_MS = 5 * 60 * 1000;

function getStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function savePendingChatPrefill(payload: Omit<PendingChatPrefill, "createdAt">) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(
    PENDING_CHAT_PREFILL_KEY,
    JSON.stringify({ ...payload, createdAt: Date.now() } satisfies PendingChatPrefill)
  );
}

export function readPendingChatPrefill(): PendingChatPrefill | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(PENDING_CHAT_PREFILL_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingChatPrefill;

    if (Date.now() - parsed.createdAt > PENDING_CHAT_PREFILL_MAX_AGE_MS) {
      storage.removeItem(PENDING_CHAT_PREFILL_KEY);
      return null;
    }

    return parsed;
  } catch {
    storage.removeItem(PENDING_CHAT_PREFILL_KEY);
    return null;
  }
}

export function clearPendingChatPrefill() {
  const storage = getStorage();
  storage?.removeItem(PENDING_CHAT_PREFILL_KEY);
}