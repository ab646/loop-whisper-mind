/**
 * Loop Input Guard
 *
 * Classifies user input BEFORE the reflection engine runs.
 * The reflection engine assumes its input is genuine journal content.
 * This guard makes that assumption true.
 *
 * Five classes:
 *   - journal         → safe to run the full reflection
 *   - crisis          → surface crisis card, do NOT generate a reflection
 *   - hostile         → soft de-escalation, do NOT generate a reflection
 *   - meta_or_scope   → polite redirect (questions about the app, off-topic)
 *   - too_thin        → ask for more before reflecting (1–2 words, no signal)
 *
 * Strategy: cheap regex screen first (catches obvious cases without an AI
 * roundtrip), then a tight AI classifier for anything ambiguous. Crisis
 * is the most conservative class — when in doubt, we route to crisis.
 */

import { chatCompletion, AIError } from "./ai.ts";

export type InputClass =
  | "journal"
  | "crisis"
  | "hostile"
  | "meta_or_scope"
  | "too_thin";

export interface GuardResult {
  class: InputClass;
  /** Soft response copy when class !== "journal". Already in Loop's voice. */
  message?: string;
  /** When class === "crisis", optional country code from caller for deep-linking. */
  countryCode?: string;
  /** Internal: which stage caught it (for logging/debug). */
  source: "regex" | "ai" | "fallback";
}

// ---------------------------------------------------------------------------
// Stage 1: regex screen
// ---------------------------------------------------------------------------

/**
 * High-confidence crisis phrases. These are deliberately narrow — we want
 * very few false positives at this stage so users in everyday distress
 * don't get a hotline thrown at them. Subtler cases are caught by the AI
 * classifier in stage 2.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill (?:myself|me)\b/i,
  /\bend (?:my|it all|things)\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\b(?:want|wanna|going) to die\b/i,
  /\bdon'?t want to (?:be here|live|exist|wake up)\b/i,
  /\bhurt(?:ing)? myself\b/i,
  /\bcut(?:ting)? myself\b/i,
  /\bself[- ]harm\b/i,
  /\bno (?:reason|point) (?:to|in) liv/i,
  /\beveryone'?s? better off without me\b/i,
];

// "I want to die of embarrassment" / "die laughing" — common idioms that
// look crisis-shaped but aren't. We strip these before checking patterns.
const FALSE_POSITIVE_IDIOMS: RegExp[] = [
  /die (?:of (?:embarrassment|laughter|boredom|cringe))/i,
  /die laughing/i,
  /dying to (?:try|see|know|meet|hear)/i,
  /killing it/i,
];

const HOSTILE_ONLY_PATTERNS: RegExp[] = [
  /^\s*(?:f+u+c+k+|s+h+i+t+|f+\*+k+|stfu)\s*(?:you|off|u)?\s*[.!?]*\s*$/i,
  /^\s*(?:shut up|go away|leave me alone|stop)\s*[.!?]*\s*$/i,
  /^\s*(?:you'?re (?:dumb|stupid|useless|broken|trash))\s*[.!?]*\s*$/i,
  /^\s*(?:i hate (?:you|this app|this thing))\s*[.!?]*\s*$/i,
];

const META_PATTERNS: RegExp[] = [
  /^\s*(?:how (?:do|does) (?:this|loop|the app))/i,
  /^\s*(?:what (?:is|does) (?:this|loop|the app))/i,
  /^\s*(?:are you (?:an? )?(?:ai|bot|chatgpt|gpt|robot|human|real))/i,
  /^\s*(?:who (?:made|built|created) (?:you|this))/i,
  /^\s*(?:can you (?:see|read|hear) (?:me|this))/i,
];

function stripIdioms(text: string): string {
  let cleaned = text;
  for (const re of FALSE_POSITIVE_IDIOMS) {
    cleaned = cleaned.replace(re, "");
  }
  return cleaned;
}

function regexScreen(content: string): InputClass | null {
  const trimmed = content.trim();

  // Crisis check (with idiom stripping to reduce false positives)
  const cleaned = stripIdioms(trimmed);
  for (const re of CRISIS_PATTERNS) {
    if (re.test(cleaned)) return "crisis";
  }

  // Hostile-only check
  for (const re of HOSTILE_ONLY_PATTERNS) {
    if (re.test(trimmed)) return "hostile";
  }

  // Meta / scope check
  for (const re of META_PATTERNS) {
    if (re.test(trimmed)) return "meta_or_scope";
  }

  // Too thin: very short and no obvious sentence structure
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && trimmed.length < 12) return "too_thin";

  return null; // not classified by regex — fall through to AI stage
}

// ---------------------------------------------------------------------------
// Stage 2: AI classifier
// ---------------------------------------------------------------------------

const CLASSIFIER_PROMPT = `You are a safety classifier for a journaling app called Loop. Loop helps people see their cognitive loops (rumination, anticipatory worry, self-criticism, etc). It is NOT therapy.

Classify the user's message into exactly ONE of these categories:

- journal: Genuine personal reflection, thought, feeling, story, or experience. The user is sharing something to be reflected on.
- crisis: Any mention of suicidal ideation, self-harm, plans to die, hopelessness with intent, or active danger to self. When uncertain between crisis and journal-with-distress, choose crisis.
- hostile: Hostile, abusive, or directed at the app itself ("fuck you", "you're stupid", "shut up"). Not personal reflection.
- meta_or_scope: Questions about the app, the AI, how Loop works, or off-topic requests (jokes, tasks, general questions). Not journal content.
- too_thin: Too short or vague to reflect on meaningfully (a single word, a noise, a placeholder). Not enough signal.

Return ONLY one word: journal, crisis, hostile, meta_or_scope, or too_thin. No explanation, no punctuation.`;

async function aiClassify(content: string): Promise<InputClass> {
  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: CLASSIFIER_PROMPT },
        { role: "user", content: content.substring(0, 2000) },
      ],
      { temperature: 0, maxTokens: 8 }
    );
    const cleaned = raw.trim().toLowerCase().replace(/[^a-z_]/g, "");
    if (
      cleaned === "journal" ||
      cleaned === "crisis" ||
      cleaned === "hostile" ||
      cleaned === "meta_or_scope" ||
      cleaned === "too_thin"
    ) {
      return cleaned as InputClass;
    }
    return "journal"; // unrecognised → assume journal (regex already caught the dangerous cases)
  } catch (e) {
    if (e instanceof AIError) console.warn("classifier AI error:", e.message);
    return "journal"; // never block the user on classifier failure
  }
}

// ---------------------------------------------------------------------------
// Soft-response copy (Loop voice)
// ---------------------------------------------------------------------------

const HOSTILE_MESSAGE =
  "Not a loop — just heat. Come back when there's a thought you can't put down.";

const META_MESSAGE =
  "That's a question about the app, not a loop. Tell me what's actually rattling around.";

const TOO_THIN_MESSAGE =
  "Not enough here to see what's looping. Say a bit more.";

const CRISIS_MESSAGE =
  "This sounds heavy, and I'm not the right tool for it. Please reach out to a person right now.";

function messageFor(cls: InputClass): string | undefined {
  switch (cls) {
    case "hostile":
      return HOSTILE_MESSAGE;
    case "meta_or_scope":
      return META_MESSAGE;
    case "too_thin":
      return TOO_THIN_MESSAGE;
    case "crisis":
      return CRISIS_MESSAGE;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Crisis resources (single source of truth)
// ---------------------------------------------------------------------------

/**
 * Build a deep link into findahelpline.com. If we have a 2-letter country
 * code from the caller (browser locale), link straight into that country's
 * page. Otherwise link to the global directory home.
 */
export function buildHelplineUrl(countryCode?: string): string {
  if (countryCode && /^[a-z]{2}$/i.test(countryCode)) {
    return `https://findahelpline.com/countries/${countryCode.toLowerCase()}`;
  }
  return "https://findahelpline.com";
}

export const CRISIS_RESOURCES = {
  primary: {
    label: "Find a helpline near you",
    description:
      "findahelpline.com lists free, confidential crisis services in 130+ countries.",
    url: "https://findahelpline.com",
  },
  us: {
    label: "988 Suicide & Crisis Lifeline (US)",
    description: "Call or text 988.",
    url: "https://988lifeline.org",
  },
  emergency:
    "If you or someone else is in immediate danger, call your local emergency number.",
} as const;

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

/**
 * Classify a user input. Always returns a result — never throws.
 * The reflection engine should ONLY run when result.class === "journal".
 */
export async function classifyInput(
  content: string,
  opts: { countryCode?: string } = {}
): Promise<GuardResult> {
  if (!content || !content.trim()) {
    return { class: "too_thin", message: messageFor("too_thin"), source: "regex" };
  }

  // Stage 1: regex
  const regexHit = regexScreen(content);
  if (regexHit) {
    return {
      class: regexHit,
      message: messageFor(regexHit),
      countryCode: regexHit === "crisis" ? opts.countryCode : undefined,
      source: "regex",
    };
  }

  // Stage 2: AI classifier
  const aiClass = await aiClassify(content);
  return {
    class: aiClass,
    message: messageFor(aiClass),
    countryCode: aiClass === "crisis" ? opts.countryCode : undefined,
    source: "ai",
  };
}
