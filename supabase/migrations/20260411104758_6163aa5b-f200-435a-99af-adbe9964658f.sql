-- Add display_content to entries for AI-beautified journal rendering.
--
-- Background:
--   `content` stores the verbatim input from the user (voice transcript or
--   typed text). The reflect function relies on raw speech signal —
--   repetition, self-correction, trailing-off — to detect cognitive loops,
--   so we must NOT beautify before reflection analysis runs.
--
--   `display_content` is a lightly cleaned version generated server-side by
--   the reflect function at entry-creation time. It only fixes punctuation,
--   removes filler words, adds natural paragraph breaks, and corrects
--   obvious typos. It never rewords, never summarizes, and preserves the
--   user's voice exactly. It is what the journal UI reads back to the user.
--
--   Nullable on purpose so existing rows keep rendering (the frontend falls
--   back to `content` + the client-side beautifyText regex when this column
--   is null).

ALTER TABLE public.entries
  ADD COLUMN display_content TEXT;

COMMENT ON COLUMN public.entries.display_content IS
  'AI-beautified version of content for journal display. Preserves voice verbatim — only fixes punctuation, filler words, and paragraphing. Null for legacy rows pre-beautification.';
