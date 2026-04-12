CREATE TABLE public.usage_counters (
  user_id       UUID NOT NULL,
  date          DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  entries_count       INT NOT NULL DEFAULT 0,
  chat_messages_count INT NOT NULL DEFAULT 0,
  explorations_count  INT NOT NULL DEFAULT 0,
  image_uploads_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage counters"
  ON public.usage_counters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage counters"
  ON public.usage_counters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage counters"
  ON public.usage_counters FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_usage_counters_user_date ON public.usage_counters (user_id, date DESC);