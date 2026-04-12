import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useSubmitFeedback } from "@/hooks/useSubmitFeedback";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function FeedbackSubmitSheet({ open, onClose, onSubmitted }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { submit, isLoading } = useSubmitFeedback(() => {
    setTitle("");
    setDescription("");
    onClose();
    onSubmitted();
  });

  const canSubmit = title.trim().length >= 3 && !isLoading;

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
            className="fixed inset-0 bg-black/50 z-40"
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl surface-low p-5 pb-8 max-w-md mx-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-on-surface font-semibold text-lg">Suggest a feature</h2>
              <button onClick={onClose} className="text-on-surface-variant p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder='e.g., Dark mode'
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-on-surface-variant mt-1 text-right">
                  {title.length} / 120
                </p>
              </div>

              <div>
                <textarea
                  placeholder="Tell us more about why this matters to you"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  disabled={isLoading}
                  rows={3}
                  className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-xs text-on-surface-variant mt-1 text-right">
                  {description.length} / 500
                </p>
              </div>

              <button
                onClick={() => submit(title, description)}
                disabled={!canSubmit}
                className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50 transition-opacity"
              >
                {isLoading ? "Submitting..." : "Submit idea"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
