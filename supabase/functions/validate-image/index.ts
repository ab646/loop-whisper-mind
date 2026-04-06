import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";
import { chatCompletionJSON, AIError } from "../_shared/ai.ts";

/**
 * Validates whether an uploaded image contains content suitable for
 * a Loop reflection — emotional writing, journal entries, screenshots
 * of thoughts, etc. Rejects random photos, memes, or non-reflective content.
 */

interface ValidationResult {
  valid: boolean;
  reason: string;
}

const VALIDATION_FALLBACK: ValidationResult = {
  valid: false,
  reason: "Could not analyze the image. Please try again.",
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
          content: `You are a content validator for Loop, a reflective journaling app. Your job is to determine if an uploaded image contains content that could be meaningfully reflected on — something that reveals thoughts, emotions, or mental patterns.

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
  "reason": "Brief explanation of why this was accepted or rejected"
}

If rejecting, make the reason friendly and helpful, like: "This looks like a technical screenshot. Loop works best with content that reflects your thoughts or feelings — try sharing a journal entry, a text conversation, or something that's been on your mind."`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Is this image suitable for emotional reflection?" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      VALIDATION_FALLBACK,
      { temperature: 0.2, maxTokens: 256 }
    );

    return jsonResponse(req, result);
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(req, e.message, e.status);
    if (e instanceof AIError) return errorResponse(req, e.message, e.status);
    console.error("validate-image error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Unknown error");
  }
});
