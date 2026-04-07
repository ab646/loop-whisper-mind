import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateLoopOptions {
  content: string;
  entryType?: string;
}

export function useCreateLoop() {
  const [loading, setLoading] = useState(false);

  const createEntry = async ({ content, entryType = "text" }: CreateLoopOptions): Promise<string | null> => {
    if (!content.trim()) return null;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reflect", {
        body: {
          content,
          entryType,
          previousMessages: [],
        },
      });

      if (error) throw error;
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
      return entryId;
    } catch (e) {
      console.error("useCreateLoop error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to process reflection");
      setLoading(false);
      return null;
    }
  };

  return { createEntry, loading };
}
