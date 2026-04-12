import { FeedbackPost } from "@/services/notionFeedbackService";
import { useFeedbackVote } from "@/hooks/useFeedbackVote";
import FeedbackVoteButton from "./FeedbackVoteButton";
import FeedbackStatusBadge from "./FeedbackStatusBadge";
import { motion } from "framer-motion";

interface Props {
  post: FeedbackPost;
  index: number;
}

export default function FeedbackCard({ post, index }: Props) {
  const { votes, hasVoted, toggleVote, isLoading } = useFeedbackVote(
    post.id,
    post.votes,
    post.hasVoted
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl surface-low p-4 flex gap-3 border border-border"
    >
      <FeedbackVoteButton
        votes={votes}
        hasVoted={hasVoted}
        onToggle={toggleVote}
        isLoading={isLoading}
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-on-surface font-medium text-sm leading-snug line-clamp-2">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-on-surface-variant text-xs mt-1 line-clamp-2">
            {post.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-on-surface-variant text-xs">{post.authorName}</span>
          <FeedbackStatusBadge status={post.status} label={post.statusLabel} />
        </div>
      </div>
    </motion.div>
  );
}
