import posthog from "posthog-js";

let sessionStartTime = Date.now();

export const analytics = {
  init() {
    posthog.init("phc_qzZZ4oV8NHDJP9x7hivXgjJqwryvRWFAnYn6SzF3HBmP", {
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: true,
      persistence: "localStorage",
    });
    sessionStartTime = Date.now();

    // Track app_backgrounded on visibility change / unload
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000);
        posthog.capture("app_backgrounded", { session_duration_seconds: sessionDuration });
      }
    });
  },

  identify(userId: string) {
    posthog.identify(userId);
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

  reflectionReceived(opts: { responseTimeMs: number; entryNumber?: number; entryId?: string; entryType?: string }) {
    this.track("reflection_received", {
      response_time_ms: opts.responseTimeMs,
      entry_number: opts.entryNumber,
      entry_id: opts.entryId,
      entry_type: opts.entryType,
    });
  },

  chatMessageSent(opts: { isFollowUp: boolean; messageLength: number }) {
    this.track("chat_message_sent", {
      is_follow_up: opts.isFollowUp,
      message_length: opts.messageLength,
    });
  },

  entrySaved(entryId: string) {
    this.track("entry_saved", { entry_id: entryId });
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
