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
