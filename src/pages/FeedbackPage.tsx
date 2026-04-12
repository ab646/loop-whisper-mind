import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useFeedbackPosts } from "@/hooks/useFeedbackPosts";
import FeedbackCard from "@/components/feedback/FeedbackCard";
import FeedbackSortToggle from "@/components/feedback/FeedbackSortToggle";
import FeedbackEmptyState from "@/components/feedback/FeedbackEmptyState";
import FeedbackSubmitSheet from "@/components/feedback/FeedbackSubmitSheet";

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl surface-low p-4 flex gap-3 animate-pulse">
          <div className="w-[52px] h-[56px] rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { posts, loading, error, sortMode, setSortMode, refetch } = useFeedbackPosts();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="h-full min-h-0 mesh-gradient-bg flex flex-col overflow-hidden">
      <div
        className="flex-1 min-h-0 scroll-container pt-6 px-5 space-y-5"
        style={{ paddingBottom: "calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 80px)" }}
      >
        {/* Header */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 text-on-surface-variant text-sm"
        >
          <ArrowLeft size={16} />
          Back to Profile
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl text-on-surface font-semibold">
            What should Loop do next?
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Vote on ideas or share your own
          </p>
        </motion.div>

        {/* Sort */}
        <FeedbackSortToggle sortMode={sortMode} onChange={setSortMode} />

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-on-surface-variant text-sm">
              Couldn't load ideas right now.
            </p>
            <button
              onClick={refetch}
              className="text-primary text-sm font-medium underline"
            >
              Try again
            </button>
            <div className="pt-2">
              <button
                onClick={() => setSheetOpen(true)}
                className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold"
              >
                Suggest an idea anyway
              </button>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <FeedbackEmptyState onSuggest={() => setSheetOpen(true)} />
        ) : (
          <div className="space-y-3.5">
            {posts.map((post, i) => (
              <FeedbackCard key={post.id} post={post} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {!loading && !error && posts.length > 0 && (
        <div
          className="sticky bottom-0 px-5 pb-2"
          style={{ marginBottom: "var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom)))" }}
        >
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus size={18} />
            Suggest an idea
          </button>
        </div>
      )}

      <FeedbackSubmitSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmitted={refetch}
      />
    </div>
  );
}
