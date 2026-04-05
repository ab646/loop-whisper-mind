import { motion } from "framer-motion";

interface PromptChipProps {
  label: string;
  onClick: () => void;
}

export function PromptChip({ label, onClick }: PromptChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="px-5 py-2.5 rounded-full surface-high text-on-surface-variant text-sm font-body font-medium hover:text-mint transition-colors border border-border/20"
    >
      {label}
    </motion.button>
  );
}
