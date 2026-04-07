import posthog from "posthog-js";

export const analytics = {
  init() {
    posthog.init("phc_qzZZ4oV8NHDJP9x7hivXgjJqwryvRWFAnYn6SzF3HBmP", {
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: true,
      persistence: "localStorage",
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

  sessionStarted() {
    this.track("session_started");
  },

  recordingStarted() {
    this.track("recording_started");
  },

  recordingCompleted(durationSeconds: number) {
    this.track("recording_completed", { duration_seconds: durationSeconds });
  },

  reflectionReceived(entryId?: string) {
    this.track("reflection_received", { entry_id: entryId });
  },

  insightsViewed(entryCount?: number) {
    this.track("insights_viewed", { entry_count: entryCount });
  },

  chatMessageSent() {
    this.track("chat_message_sent");
  },

  onboardingStepCompleted(step: number, stepType: string) {
    this.track("onboarding_step_completed", { step, step_type: stepType });
  },
};
