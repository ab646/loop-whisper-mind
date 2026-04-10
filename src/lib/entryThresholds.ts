/**
 * Quality + cost thresholds for voice and text entries.
 *
 * Why these exist:
 *  - Whisper hallucinates on <2s or silent audio (returns "Thank you.",
 *    "Thanks for watching!", etc. from its training data). A duration floor
 *    kills this failure mode before it reaches the LLM.
 *  - The LLM cannot meaningfully identify a cognitive loop from <15 words.
 *    Without a word floor the user gets shallow output and abandons.
 *  - Accidental mic taps waste API cost and degrade user trust.
 *
 * UX rule: these are soft floors, never hard blocks. Always give the user
 * agency to continue, add more, or send as-is.
 *
 * Tune with telemetry — see `entry_too_short` and `entry_below_word_floor`
 * PostHog events.
 */

export const ENTRY_THRESHOLDS = {
  /** Minimum recording length in milliseconds before we'll even stop. */
  MIN_RECORDING_MS: 3000,

  /** Minimum recording length in seconds — derived, for timer-based checks. */
  MIN_RECORDING_SECONDS: 3,

  /**
   * Below this word count we don't run full loop analysis. The reflect edge
   * function is still called, but with a `briefEntry` flag so the LLM gives
   * a softer, shorter response instead of pretending to find a pattern.
   */
  MIN_WORDS_FOR_LOOP_ANALYSIS: 15,

  /**
   * Above this word count we treat the entry as high-confidence. Below this
   * (but above MIN_WORDS_FOR_LOOP_ANALYSIS) we still analyse but tell the
   * LLM to stay humble about pattern claims.
   */
  MIN_WORDS_FOR_HIGH_CONFIDENCE: 30,

  /**
   * Hard floor for any text entry. Anything below this is almost certainly
   * a misclick or test tap — reject with a gentle prompt.
   */
  MIN_WORDS_FOR_TEXT_ENTRY: 3,
} as const;

export type EntryConfidence = "brief" | "standard" | "high";

/**
 * Count words in a string. Collapses whitespace, ignores empty tokens.
 * Matches what the reflect edge function sees after `.trim().split(/\s+/)`.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Classify an entry's confidence level based on word count. The reflect
 * edge function can use this to adjust prompt tone and response length.
 */
export function classifyEntry(text: string): EntryConfidence {
  const words = countWords(text);
  if (words < ENTRY_THRESHOLDS.MIN_WORDS_FOR_LOOP_ANALYSIS) return "brief";
  if (words < ENTRY_THRESHOLDS.MIN_WORDS_FOR_HIGH_CONFIDENCE) return "standard";
  return "high";
}

/**
 * Known Whisper hallucination phrases. If the transcript matches one of
 * these (case-insensitive, trimmed, ignoring trailing punctuation), we
 * treat it as a silent-audio false positive and reject the entry.
 *
 * Source: widely reported Whisper failure mode on silent or <2s audio,
 * where the model regurgitates YouTube subtitle artifacts from training.
 */
const WHISPER_HALLUCINATION_PHRASES = new Set([
  "thank you",
  "thanks for watching",
  "thanks for watching!",
  "please subscribe",
  "subscribe to my channel",
  "bye",
  "bye bye",
  "you",
  ".",
  "",
]);

/**
 * Detect if a transcript is almost certainly a Whisper hallucination on
 * silent/short audio. Returns true if the entire transcript matches a
 * known artifact phrase.
 */
export function isLikelyWhisperHallucination(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim();
  return WHISPER_HALLUCINATION_PHRASES.has(normalized);
}
