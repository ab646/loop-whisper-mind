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
      className="tag-pill tag-pill-interactive min-h-[44px] py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
    >
      {label}
    </motion.button>
  );
}
