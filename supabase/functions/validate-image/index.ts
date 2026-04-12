import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";
import { chatCompletionJSON, AIError } from "../_shared/ai.ts";

/**
 * Validates whether an uploaded image contains content suitable for
 * a Loop reflection, and if valid, extracts/transcribes the text content
 * from the image so the image itself can be discarded.
 */

interface ValidationResult {
  valid: boolean;
  reason: string;
  transcription: string | null;
  pii_detected: boolean;
}

const VALIDATION_FALLBACK: ValidationResult = {
  valid: false,
  reason: "I couldn't read this one. Try a screenshot of what's looping — a text, a note, something with words.",
  transcription: null,
  pii_detected: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    await authenticateRequest(req);

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return errorResponse(req, "Image URL required", 400);
    }

    const result = await chatCompletionJSON<ValidationResult>(
      [
        {
          role: "system",
          content: `You are a content validator and transcriber for Loop, a reflective journaling app. Your job is to:
1. Determine if an uploaded image contains content that could be meaningfully reflected on
2. If valid, extract and transcribe ALL text/content from the image into a natural paragraph

ACCEPT images that contain:
- Screenshots of text messages, social media posts, emails, or notes that reveal emotional content or interpersonal dynamics
- Journal entries, handwritten notes, or typed thoughts
- Screenshots showing stressful situations (work messages, notifications, to-do lists)
- Photos that clearly capture an emotional moment or situation someone wants to process
- Memes or quotes that reflect someone's current emotional state

REJECT images that contain:
- Random photos with no emotional or reflective content (landscapes, food, objects)
- Technical screenshots (code, settings, redirect rules, dashboards)
- Documents, forms, or administrative content
- Blurry or unreadable images
- Advertisements or product photos

Return ONLY valid JSON:
{
  "valid": true/false,
  "reason": "Brief explanation of why this was accepted or rejected",
  "transcription": "If valid, provide a faithful transcription of all visible text (PII redacted) and a brief description of any visual context (e.g. 'Screenshot of a text conversation where...'). If rejected, null.",
  "pii_detected": true/false
}

PRIVACY — PII handling:
- If the image contains sensitive personal information (phone numbers, email addresses, full names of other people, physical addresses, financial details, government IDs), REDACT them in the transcription by replacing with [redacted]
- Keep the user's own first name if visible, but redact last names and other people's full names
- Set "pii_detected" to true in your response if any PII was found and redacted
- This protects the user's contacts and keeps stored reflections safe

For the transcription:
- Extract ALL visible text faithfully (with PII redacted as above)
- Add brief context about what the image shows (e.g. 'A text message conversation between...')
- If it's handwritten, do your best to transcribe accurately
- If it's a photo (not text), describe what's happening emotionally in the scene
- Make it read naturally as a journal entry someone could reflect on

If rejecting, write the reason in Loop's voice: warm but direct, first-person ("I"), specific not generic. Never apologize, never say "sorry", never say "unfortunately". Tell the user what you'd actually need instead — e.g. "I can't work with this one. Try a screenshot of what's looping — a text, a note, something with words." Keep it under 25 words. Never use therapy-speak or coping advice.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image: validate it for reflection and transcribe its content." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      VALIDATION_FALLBACK,
      { temperature: 0.2, maxTokens: 1024 }
    );

    return jsonResponse(req, result);
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(req, e.message, e.status);
    if (e instanceof AIError) return errorResponse(req, e.message, e.status);
    console.error("validate-image error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Unknown error");
  }
});
