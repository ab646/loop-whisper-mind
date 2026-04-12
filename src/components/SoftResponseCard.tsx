import { motion } from "framer-motion";

interface SoftResponseCardProps {
  message: string;
  /** Visual variant — affects the label only. */
  variant: "hostile" | "meta_or_scope" | "too_thin";
  /** Called when user dismisses the card. */
  onDismiss?: () => void;
}

const LABELS: Record<SoftResponseCardProps["variant"], string> = {
  hostile: "Loop",
  meta_or_scope: "Loop",
  too_thin: "Loop",
};

/**
 * Surfaced when the input guard classifies a message as something other
 * than journal content (and not a crisis). Renders a short, plain-text
 * note from Loop instead of a full ReflectionCard.
 */
export function SoftResponseCard({ message, variant, onDismiss }: SoftResponseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border/30 bg-surface/60 p-4 space-y-3"
    >
      <p className="label-uppercase text-on-surface-variant">{LABELS[variant]}</p>
      <p className="text-on-surface text-[15px] leading-relaxed">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-mint text-sm font-semibold pt-1"
        >
          Got it
        </button>
      )}
    </motion.div>
  );
}
