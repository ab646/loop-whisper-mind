import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ENTRY_THRESHOLDS,
  classifyEntry,
  countWords,
} from "@/lib/entryThresholds";
import { analytics } from "@/lib/analytics";

interface CreateLoopOptions {
  content: string;
  entryType?: string;
}

export interface GuardResponse {
  class: string;
  message: string;
  resources?: any;
}

export interface CreateLoopResult {
  entryId?: string;
  guard?: GuardResponse;
}

export function useCreateLoop() {
  const [loading, setLoading] = useState(false);

  const createEntry = async ({ content, entryType = "text" }: CreateLoopOptions): Promise<CreateLoopResult | null> => {
    const trimmed = content.trim();

    // ── Scenario A: empty content ──────────────────────────────────
    if (!trimmed) return null;

    const wordCount = countWords(trimmed);

    // ── Scenario B: hard floor for text entries ────────────────────
    // Anything under MIN_WORDS_FOR_TEXT_ENTRY words is almost always a
    // misclick, test tap, or "hi" — reject with a friendly prompt.
    // Voice entries bypass this gate because they already passed the
    // duration floor and Whisper hallucination check in RecordingPage.
    if (entryType === "text" && wordCount < ENTRY_THRESHOLDS.MIN_WORDS_FOR_TEXT_ENTRY) {
      analytics.entryBelowWordFloor({
        source: "text",
        wordCount,
        floor: ENTRY_THRESHOLDS.MIN_WORDS_FOR_TEXT_ENTRY,
        action: "rejected",
      });
      toast("A few more words?", {
        description: "Tell me a bit more about what's on your mind.",
      });
      return null;
    }

    // Classify confidence so the reflect function can adjust tone:
    //   - "brief"    → short acknowledgement, no pattern claims
    //   - "standard" → normal reflection, humble on pattern detection
    //   - "high"     → full loop analysis
    const confidence = classifyEntry(trimmed);

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reflect", {
        body: {
          content: trimmed,
          entryType,
          confidence,
          wordCount,
          previousMessages: [],
          countryCode: navigator.language?.split("-")[1]?.toUpperCase() || undefined,
        },
      });

      if (error) throw error;

      // Handle input guard responses (crisis, hostile, meta, too_thin)
      if (data?.guard) {
        if (data.guard.class === "crisis") {
          setLoading(false);
          return { guard: data.guard };
        }
        // For hostile, meta_or_scope, too_thin — show the soft message
        toast(data.guard.message || "Try sharing a bit more about what's on your mind.", {
          duration: 5000,
        });
        setLoading(false);
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return null;
      }

      const entryId = data?.entryId;
      if (!entryId) {
        toast.error("Failed to create reflection");
        setLoading(false);
        return null;
      }

      setLoading(false);
      return { entryId };
    } catch (e) {
      console.error("useCreateLoop error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to process reflection");
      setLoading(false);
      return null;
    }
  };

  return { createEntry, loading };
}
