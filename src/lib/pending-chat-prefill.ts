type PendingChatPrefill = {
  autoSubmit?: boolean;
  createdAt: number;
  prefillText?: string;
};

const PENDING_CHAT_PREFILL_KEY = "loop.pending-chat-prefill";
const PENDING_CHAT_PREFILL_MAX_AGE_MS = 5 * 60 * 1000;

function getStorages() {
  if (typeof window === "undefined") return [] as Storage[];

  const storages: Storage[] = [];

  try {
    storages.push(window.localStorage);
  } catch {
    // noop
  }

  try {
    storages.push(window.sessionStorage);
  } catch {
    // noop
  }

  return storages;
}

export function savePendingChatPrefill(payload: Omit<PendingChatPrefill, "createdAt">) {
  const storages = getStorages();
  if (storages.length === 0) return;

  const value = JSON.stringify({
    ...payload,
    createdAt: Date.now(),
  } satisfies PendingChatPrefill);

  storages.forEach((storage) => storage.setItem(PENDING_CHAT_PREFILL_KEY, value));
}

export function readPendingChatPrefill(): PendingChatPrefill | null {
  const storages = getStorages();
  if (storages.length === 0) return null;

  for (const storage of storages) {
    const raw = storage.getItem(PENDING_CHAT_PREFILL_KEY);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as PendingChatPrefill;

      if (Date.now() - parsed.createdAt > PENDING_CHAT_PREFILL_MAX_AGE_MS) {
        storage.removeItem(PENDING_CHAT_PREFILL_KEY);
        continue;
      }

      return parsed;
    } catch {
      storage.removeItem(PENDING_CHAT_PREFILL_KEY);
    }
  }

  return null;
}

export function clearPendingChatPrefill() {
  getStorages().forEach((storage) => storage.removeItem(PENDING_CHAT_PREFILL_KEY));
}