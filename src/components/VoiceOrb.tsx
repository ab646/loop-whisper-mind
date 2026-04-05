import { Mic } from "lucide-react";
import { motion } from "framer-motion";

interface VoiceOrbProps {
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  label?: string;
}

const sizes = {
  sm: "w-14 h-14",
  md: "w-24 h-24",
  lg: "w-40 h-40",
};

const iconSizes = {
  sm: 18,
  md: 28,
  lg: 40,
};

export function VoiceOrb({ size = "lg", onClick, label }: VoiceOrbProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.04 }}
        onClick={onClick}
        className={`${sizes[size]} rounded-full orb-gradient orb-shadow flex items-center justify-center relative`}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-transparent" />
        <Mic size={iconSizes[size]} className="text-primary-foreground relative z-10" />
      </motion.button>
      {label && (
        <span className="label-uppercase text-mint">{label}</span>
      )}
    </div>
  );
}
