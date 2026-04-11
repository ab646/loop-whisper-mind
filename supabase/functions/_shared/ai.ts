/**
 * AI provider abstraction for Loop.
 *
 * Supports multiple backends via environment variables:
 *   AI_PROVIDER=lovable (default) — uses Lovable's gateway with LOVABLE_API_KEY
 *   AI_PROVIDER=anthropic          — uses Claude API with ANTHROPIC_API_KEY
 *   AI_PROVIDER=openai             — uses OpenAI API with OPENAI_API_KEY
 *   AI_PROVIDER=google             — uses Google AI with GOOGLE_AI_API_KEY
 *
 * To switch providers, just set the env vars in Supabase dashboard.
 * No code changes needed.
 */

type AIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | AIContentPart[];
}

interface AIOptions {
  temperature?: number;
  maxTokens?: number;
}

interface ProviderConfig {
  url: string;
  apiKey: string;
  model: string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (
    model: string,
    messages: AIMessage[],
    options: AIOptions
  ) => Record<string, unknown>;
  extractContent: (data: unknown) => string;
}

const PROVIDERS: Record<string, () => ProviderConfig> = {
  lovable: () => ({
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey: requireEnv("LOVABLE_API_KEY"),
    model: Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview",
    buildHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    buildBody: (model, messages, options) => ({
      model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 2048,
    }),
    extractContent: (data: any) =>
      data?.choices?.[0]?.message?.content || "",
  }),

  anthropic: () => ({
    url: "https://api.anthropic.com/v1/messages",
    apiKey: requireEnv("ANTHROPIC_API_KEY"),
    model: Deno.env.get("AI_MODEL") || "claude-sonnet-4-20250514",
    buildHeaders: (apiKey) => ({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    }),
    buildBody: (model, messages, options) => {
      const system = messages.find((m) => m.role === "system");
      const systemContent = typeof system?.content === "string" ? system.content : "";
      const userMessages = messages.filter((m) => m.role !== "system");
      return {
        model,
        system: systemContent,
        messages: userMessages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 2048,
      };
    },
    extractContent: (data: any) =>
      data?.content?.[0]?.text || "",
  }),

  openai: () => ({
    url: "https://api.openai.com/v1/chat/completions",
    apiKey: requireEnv("OPENAI_API_KEY"),
    model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
    buildHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    buildBody: (model, messages, options) => ({
      model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 2048,
    }),
    extractContent: (data: any) =>
      data?.choices?.[0]?.message?.content || "",
  }),

  google: () => ({
    url: "",  // built dynamically with model name
    apiKey: requireEnv("GOOGLE_AI_API_KEY"),
    model: Deno.env.get("AI_MODEL") || "gemini-2.0-flash",
    buildHeaders: () => ({
      "Content-Type": "application/json",
    }),
    buildBody: (model, messages, options) => {
      const system = messages.find((m) => m.role === "system");
      const systemContent = typeof system?.content === "string" ? system.content : "";
      const userMessages = messages.filter((m) => m.role !== "system");
      return {
        system_instruction: { parts: [{ text: systemContent }] },
        contents: userMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: typeof m.content === "string" ? m.content : m.content.map(p => p.type === "text" ? p.text : "").join("") }],
        })),
        generationConfig: {
          temperature: options.temperature ?? 0.4,
          maxOutputTokens: options.maxTokens ?? 2048,
        },
      };
    },
    extractContent: (data: any) =>
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "",
  }),
};

function requireEnv(name: string): string {
  const val = Deno.env.get(name);
  if (!val) throw new Error(`${name} is not configured`);
  return val;
}

function getProvider(): ProviderConfig {
  const providerName = (Deno.env.get("AI_PROVIDER") || "lovable").toLowerCase();
  const factory = PROVIDERS[providerName];
  if (!factory) {
    throw new Error(
      `Unknown AI_PROVIDER "${providerName}". Supported: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return factory();
}

/**
 * Send a chat completion request to the configured AI provider.
 * Returns the raw text response.
 */
export async function chatCompletion(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<string> {
  const provider = getProvider();

  let url = provider.url;
  // Google uses a different URL structure
  if ((Deno.env.get("AI_PROVIDER") || "lovable") === "google") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: provider.buildHeaders(provider.apiKey),
    body: JSON.stringify(
      provider.buildBody(provider.model, messages, options)
    ),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new AIError("Rate limited, please try again shortly.", 429);
    }
    if (response.status === 402) {
      throw new AIError("AI credits exhausted.", 402);
    }
    const text = await response.text().catch(() => "");
    throw new AIError(
      `AI provider error (${response.status}): ${text.substring(0, 200)}`,
      response.status
    );
  }

  const data = await response.json();
  return provider.extractContent(data);
}

/**
 * Send a chat completion and parse the result as JSON.
 * Strips markdown code fences and validates structure.
 */
export async function chatCompletionJSON<T>(
  messages: AIMessage[],
  fallback: T,
  options: AIOptions = {}
): Promise<T> {
  const raw = await chatCompletion(messages, options);

  try {
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn("Failed to parse AI response as JSON, using fallback:", raw.substring(0, 200));
    return fallback;
  }
}

export class AIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

/**
 * Beautify a raw user entry so it reads like a journal entry, while
 * preserving the user's voice EXACTLY.
 *
 * Scope (what it does):
 *   - Fix punctuation and capitalization
 *   - Remove obvious speech fillers ("um", "uh", "like", "you know", etc.)
 *   - Collapse stutters and repeated false-starts ("I I I thought" → "I thought")
 *   - Break long run-on text into natural paragraphs at topic shifts
 *   - Fix obvious typos (only unambiguous ones)
 *
 * Hard no-go (what it must NEVER do):
 *   - Never reword, rephrase, summarize, or condense
 *   - Never add information the user didn't say
 *   - Never remove content (only fillers and stutters)
 *   - Never translate
 *   - Never "improve" tone, grammar beyond punctuation, or sentence flow
 *   - Never add a title, header, or closing line
 *   - Never wrap output in code fences or markdown
 *
 * The raw `content` column is the source of truth for the reflect
 * pipeline. This beautified version lives in `display_content` and is
 * used only for rendering the entry back to the user in the journal.
 *
 * Returns the beautified string, or the original raw content if the model
 * fails, rate-limits, or refuses — so entry creation is never blocked.
 */
export async function beautifyEntry(raw: string): Promise<string> {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return trimmed;

  // Don't even bother on very short inputs — the rules below would add
  // nothing and we'd just burn a model call.
  if (trimmed.length < 40) return trimmed;

  const systemPrompt = `You are a journal formatter. Your only job is to take a raw voice transcript or freely typed note and format it so it reads like a journal entry, while preserving the writer's voice EXACTLY.

## What you DO
- Fix punctuation and capitalization.
- Remove obvious speech fillers: "um", "uh", "like" (when used as filler, not comparison), "you know", "I mean", "basically", "actually" (when filler), "so yeah", "kind of" / "sort of" (when filler), "I guess" (when filler).
- Collapse stutters and false starts: "I I I was thinking" → "I was thinking". "it was, it was hard" → "it was hard".
- Add paragraph breaks at natural topic shifts. Use a blank line between paragraphs.
- Fix only obvious, unambiguous typos (e.g. "teh" → "the"). Leave everything else alone.

## What you MUST NEVER DO
- Never reword. Never rephrase. Never paraphrase. Never summarize. Never shorten.
- Never add words, sentences, or ideas the writer didn't say.
- Never remove any content beyond fillers and stutters.
- Never "improve" grammar beyond punctuation — if they said "me and my sister went", leave it.
- Never "improve" tone, warmth, or emotional register.
- Never translate.
- Never add a title, heading, bullets, bold, italics, or any markdown.
- Never wrap output in code fences.
- Never add an intro or outro line.
- Never censor profanity, crisis language, or distressing content.
- Never remove self-corrections that carry meaning ("I wasn't upset — well, I was, but") — these are important psychological signal and MUST stay.

If you are unsure whether a change is safe, do not make the change.

## Output format
Return ONLY the beautified text. No preamble, no explanation, no quotation marks around the output, nothing else.

If the input is already clean or too short to meaningfully beautify, return it unchanged.`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: trimmed },
      ],
      { temperature: 0.2, maxTokens: 2048 }
    );

    const cleaned = (result || "")
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .trim();

    // Safety check: if the model returned something dramatically shorter
    // than the input, it probably summarized — fall back to raw.
    const rawLen = trimmed.length;
    const outLen = cleaned.length;
    if (!cleaned || outLen < rawLen * 0.6) {
      console.warn("[beautifyEntry] output suspiciously short, falling back to raw", {
        rawLen,
        outLen,
      });
      return trimmed;
    }

    return cleaned;
  } catch (e) {
    console.warn("[beautifyEntry] failed, falling back to raw:", e);
    return trimmed;
  }
}
