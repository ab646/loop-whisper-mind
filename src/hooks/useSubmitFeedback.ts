import { useState, useCallback } from "react";
import { createFeedbackPost } from "@/services/notionFeedbackService";
import { toast } from "sonner";

export function useSubmitFeedback(onSuccess: () => void) {
  const [isLoading, setIsLoading] = useState(false);

  const submit = useCallback(async (title: string, description: string) => {
    setIsLoading(true);
    try {
      await createFeedbackPost(title, description);
      toast.success("Thanks! Your idea has been posted.");
      onSuccess();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  return { submit, isLoading };
}
