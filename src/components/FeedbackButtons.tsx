import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackButtonsProps {
  contentType: string;
  contentId: string;
  contentPreview?: string;
}

export function FeedbackButtons({ contentType, contentId, contentPreview }: FeedbackButtonsProps) {
  const { session } = useAuth();
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("feedback" as any)
      .select("rating")
      .eq("user_id", session.user.id)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.rating) setRating(data.rating);
      });
  }, [session, contentType, contentId]);

  const handleRate = async (value: 1 | -1) => {
    if (!session?.user?.id || saving) return;
    setSaving(true);

    const newRating = rating === value ? null : value;

    if (newRating === null) {
      await supabase
        .from("feedback" as any)
        .delete()
        .eq("user_id", session.user.id)
        .eq("content_type", contentType)
        .eq("content_id", contentId);
    } else {
      await supabase
        .from("feedback" as any)
        .upsert(
          {
            user_id: session.user.id,
            content_type: contentType,
            content_id: contentId,
            content_preview: contentPreview?.substring(0, 200),
            rating: newRating,
          },
          { onConflict: "user_id,content_type,content_id" }
        );
    }

    setRating(newRating);
    setSaving(false);
  };

  if (!session) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleRate(1)}
        disabled={saving}
        className={`p-1.5 rounded-lg transition-colors ${
          rating === 1
            ? "text-mint bg-mint/10"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-high"
        } disabled:opacity-50`}
        aria-label="Thumbs up"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => handleRate(-1)}
        disabled={saving}
        className={`p-1.5 rounded-lg transition-colors ${
          rating === -1
            ? "text-destructive bg-destructive/10"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-high"
        } disabled:opacity-50`}
        aria-label="Thumbs down"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}
