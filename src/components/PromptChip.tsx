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
      className="px-5 py-2.5 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-sm font-body font-medium hover:text-secondary/80 transition-colors"
    >
      {label}
    </motion.button>
  );
}
