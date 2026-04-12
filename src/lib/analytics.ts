import posthog from "posthog-js";

let sessionStartTime = Date.now();

// SEC-33: Hash entry IDs before sending to analytics to avoid leaking Supabase UUIDs
async function hashId(id: string): Promise<string> {
  const data = new TextEncoder().encode(id);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Detect internal/test traffic so it can be filtered out of dashboards.
 * Returns an environment label or null for real users.
 *
 * Matches:
 *  - Lovable previews  (*.lovableproject.com, *.lovable.app)
 *  - Xcode / Capacitor  (capacitor://localhost)
 *  - localhost dev server
 *  - Known internal email addresses
 */
function detectInternalEnvironment(): string | null {
  const host = window.location.hostname ?? "";
  const protocol = window.location.protocol ?? "";

  if (host.endsWith(".lovableproject.com") || host.endsWith(".lovable.app")) return "lovable_preview";
  if (protocol === "capacitor:" || host === "localhost" || host === "127.0.0.1") return "local_dev";

  return null;
}

/** Email addresses and domains that should always be flagged as internal */
const INTERNAL_EMAILS = ["hello@adrienbarbusse.com"];
const INTERNAL_DOMAINS = ["adrienbarbusse.com", "loopmind.care"];

export const analytics = {
  init() {
    const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
    if (!posthogKey) return; // Skip analytics if key not configured
    posthog.init(posthogKey, {
      api_host: "https://eu.i.posthog.com",
      autocapture: false,
      capture_pageview: true,
      persistence: "localStorage",
      cross_subdomain_cookie: true,
    });
    sessionStartTime = Date.now();

    // Tag internal/test traffic on every session so PostHog can filter it
    const internalEnv = detectInternalEnvironment();
    if (internalEnv) {
      posthog.register({ is_internal: true, internal_environment: internalEnv });
    }

    // Track app_backgrounded on visibility change / unload
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000);
        posthog.capture("app_backgrounded", { session_duration_seconds: sessionDuration });
      }
    });
  },

  identify(userId: string, email?: string) {
    posthog.identify(userId);
    // Flag known internal users by email or domain so they can be filtered out
    if (email) {
      const lower = email.toLowerCase();
      const domain = lower.split("@")[1] ?? "";
      if (INTERNAL_EMAILS.includes(lower) || INTERNAL_DOMAINS.includes(domain)) {
        posthog.people.set({ is_internal: true, internal_reason: "team_email" });
      }
    }
  },

  reset() {
    posthog.reset();
  },

  track(event: string, properties?: Record<string, unknown>) {
    posthog.capture(event, properties);
  },

  // ── Core Journey ──

  appOpened(source: string = "organic") {
    sessionStartTime = Date.now();
    this.track("app_opened", { source });
  },

  onboardingStarted() {
    this.track("onboarding_started", { step: 0 });
  },

  onboardingStepCompleted(step: number, stepType: string) {
    this.track("onboarding_step_completed", { step, step_type: stepType });
  },

  onboardingCompleted(finalStep: number) {
    this.track("onboarding_completed", { step: finalStep });
  },

  onboardingSkipped(atStep: number) {
    this.track("onboarding_skipped", { step: atStep });
  },

  recordingStarted() {
    this.track("recording_started");
  },

  recordingCompleted(durationSeconds: number) {
    this.track("recording_completed", { duration_seconds: durationSeconds });
  },

  transcriptionCompleted(wordCount: number, audioFormat: string) {
    this.track("transcription_completed", { word_count: wordCount, audio_format: audioFormat });
  },

  recordingTooShort(durationSeconds: number, minSeconds: number) {
    this.track("recording_too_short", {
      duration_seconds: durationSeconds,
      min_seconds: minSeconds,
    });
  },

  transcriptionHallucinationRejected(rawText: string, audioFormat: string) {
    this.track("transcription_hallucination_rejected", {
      text_length: rawText.length,
      audio_format: audioFormat,
    });
  },

  entryBelowWordFloor(opts: {
    source: "voice" | "text";
    wordCount: number;
    floor: number;
    action: "prompted_to_add_more" | "sent_as_brief" | "rejected";
  }) {
    this.track("entry_below_word_floor", {
      source: opts.source,
      word_count: opts.wordCount,
      floor: opts.floor,
      action: opts.action,
    });
  },

  async reflectionReceived(opts: { responseTimeMs: number; entryNumber?: number; entryId?: string; entryType?: string }) {
    this.track("reflection_received", {
      response_time_ms: opts.responseTimeMs,
      entry_number: opts.entryNumber,
      entry_id: opts.entryId ? await hashId(opts.entryId) : undefined,
      entry_type: opts.entryType,
    });
  },

  chatMessageSent(opts: { isFollowUp: boolean; messageLength: number }) {
    this.track("chat_message_sent", {
      is_follow_up: opts.isFollowUp,
      message_length: opts.messageLength,
    });
  },

  async entrySaved(entryId: string) {
    this.track("entry_saved", { entry_id: await hashId(entryId) });
  },

  // ── Feature Engagement ──

  insightsViewed(entryCount?: number) {
    this.track("insights_viewed", { entry_count: entryCount });
  },

  echoTapped(themeName: string) {
    this.track("echo_tapped", { theme_name: themeName });
  },

  catalystTapped(triggerLabel: string) {
    this.track("catalyst_tapped", { trigger_label: triggerLabel });
  },

  perspectiveViewed() {
    this.track("perspective_viewed");
  },

  themePageViewed(themeName: string) {
    this.track("theme_page_viewed", { theme_name: themeName });
  },

  // ── Retention Signals ──

  streakShown(streakCount: number) {
    this.track("streak_shown", { streak_count: streakCount });
  },

  notificationOpened() {
    this.track("notification_opened");
  },
};
