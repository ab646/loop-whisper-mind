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
      className="px-5 py-2.5 rounded-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-sm font-body font-medium hover:text-[hsl(var(--foreground))] transition-colors"
    >
      {label}
    </motion.button>
  );
}
