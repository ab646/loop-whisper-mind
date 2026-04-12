-- ============================================================
-- Usage counters — daily abuse limits (cost protection)
-- ============================================================
-- Tracks per-user daily usage of AI-backed features to prevent
-- runaway costs. NOT freemium gating — just abuse ceilings.
-- Normal users should never hit these limits.
-- See Notion: "Usage & Abuse Limits — Product Spec"
-- ============================================================

CREATE TABLE public.usage_counters (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  entries_count       INT NOT NULL DEFAULT 0,
  chat_messages_count INT NOT NULL DEFAULT 0,
  explorations_count  INT NOT NULL DEFAULT 0,
  image_uploads_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- RLS: users can only see and modify their own counters
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage counters"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage counters"
  ON public.usage_counters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage counters"
  ON public.usage_counters FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS, so edge functions (which use adminClient)
-- can always read/write counters regardless of these policies.

-- Index for fast lookups by user + today's date
CREATE INDEX idx_usage_counters_user_date
  ON public.usage_counters (user_id, date DESC);

-- Auto-cleanup: drop rows older than 30 days (run via pg_cron or manual)
-- For now, just a comment — implement when pg_cron is available.
-- SELECT cron.schedule('cleanup-usage-counters', '0 3 * * *',
--   $$DELETE FROM public.usage_counters WHERE date < now() - interval '30 days'$$
-- );
