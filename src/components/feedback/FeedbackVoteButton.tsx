import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";

interface Props {
  votes: number;
  hasVoted: boolean;
  onToggle: () => void;
  isLoading: boolean;
}

export default function FeedbackVoteButton({ votes, hasVoted, onToggle, isLoading }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={isLoading}
      className={`flex flex-col items-center justify-center rounded-xl min-w-[52px] py-2 px-2 transition-colors ${
        hasVoted
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground"
      } ${isLoading ? "opacity-50" : ""}`}
      aria-label={hasVoted ? "Remove vote" : "Upvote"}
    >
      <ChevronUp size={18} strokeWidth={2.5} />
      <span className="text-sm font-semibold leading-tight">{votes}</span>
    </motion.button>
  );
}
