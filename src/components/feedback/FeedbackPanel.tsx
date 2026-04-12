import { useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
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

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackPanel({ open, onClose }: Props) {
  const { posts, loading, error, sortMode, setSortMode, refetch } = useFeedbackPosts();
  const [sheetOpen, setSheetOpen] = useState(false);
  const constraintsRef = useRef(null);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 300) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[60]"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-[61] flex flex-col max-w-md mx-auto"
            style={{ height: "85dvh", maxHeight: "85dvh" }}
          >
            <div className="rounded-t-2xl surface-low flex flex-col h-full overflow-hidden">
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="px-5 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="font-display text-xl text-on-surface font-semibold">
                    What should Loop do next?
                  </h1>
                  <p className="text-on-surface-variant text-sm mt-0.5">
                    Vote on ideas or share your own
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-on-surface-variant p-1.5 -mr-1.5 rounded-full hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sort */}
              <div className="px-5 pb-3">
                <FeedbackSortToggle sortMode={sortMode} onChange={setSortMode} />
              </div>

              {/* Content — scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 space-y-3 overscroll-contain">
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
                        Suggest a feature anyway
                      </button>
                    </div>
                  </div>
                ) : posts.length === 0 ? (
                  <FeedbackEmptyState onSuggest={() => setSheetOpen(true)} />
                ) : (
                  posts.map((post, i) => (
                    <FeedbackCard key={post.id} post={post} index={i} />
                  ))
                )}
              </div>

              {/* Sticky CTA */}
              {!loading && !error && posts.length > 0 && (
                <div className="px-5 py-3 border-t border-border">
                  <button
                    onClick={() => setSheetOpen(true)}
                    className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Suggest a feature
                  </button>
                </div>
              )}
            </div>

            <FeedbackSubmitSheet
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              onSubmitted={refetch}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
