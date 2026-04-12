import { useState, useCallback } from "react";
import { toggleFeedbackVote } from "@/services/notionFeedbackService";
import { toast } from "sonner";

export function useFeedbackVote(
  postId: string,
  initialVotes: number,
  initialHasVoted: boolean
) {
  const [votes, setVotes] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [isLoading, setIsLoading] = useState(false);

  // Sync from parent when props change
  useState(() => {
    setVotes(initialVotes);
    setHasVoted(initialHasVoted);
  });

  const toggleVote = useCallback(async () => {
    if (isLoading) return;

    // Optimistic update
    const prevVotes = votes;
    const prevHasVoted = hasVoted;
    setVotes(hasVoted ? votes - 1 : votes + 1);
    setHasVoted(!hasVoted);
    setIsLoading(true);

    try {
      const result = await toggleFeedbackVote(postId);
      setVotes(result.votes);
      setHasVoted(result.hasVoted);
    } catch {
      // Rollback
      setVotes(prevVotes);
      setHasVoted(prevHasVoted);
      toast.error("Couldn't register your vote. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [postId, votes, hasVoted, isLoading]);

  return { votes, hasVoted, toggleVote, isLoading };
}
