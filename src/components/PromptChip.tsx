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
      className="tag-pill tag-pill-interactive"
    >
      {label}
    </motion.button>
  );
}
