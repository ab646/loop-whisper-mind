import { motion, useReducedMotion } from "framer-motion";

interface VoiceOrbProps {
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  label?: string;
  layoutId?: string;
}

const sizes = {
  sm: "w-14 h-14",
  md: "w-24 h-24",
  lg: "w-44 h-44",
};

const iconSizes = {
  sm: 20,
  md: 36,
  lg: 64,
};

/** Filled microphone SVG — matches reference proportions */
function FilledMic({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary-foreground relative z-10"
    >
      <rect x="8" y="1" width="8" height="13" rx="4" />
      <path d="M5 10a1 1 0 0 0-2 0 9 9 0 0 0 8 8.94V22a1 1 0 1 0 2 0v-3.06A9 9 0 0 0 21 10a1 1 0 0 0-2 0 7 7 0 0 1-14 0Z" />
    </svg>
  );
}

export function VoiceOrb({ size = "lg", onClick, label, layoutId }: VoiceOrbProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        layoutId={layoutId}
        whileTap={prefersReduced ? undefined : { scale: 0.92 }}
        whileHover={prefersReduced ? undefined : { scale: 1.04 }}
        onClick={onClick}
        className={`${sizes[size]} rounded-full orb-gradient orb-shadow flex items-center justify-center relative`}
        transition={{ layout: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-transparent" />
        <FilledMic size={iconSizes[size]} />
      </motion.button>
      {label && (
        <span className="label-uppercase text-mint">{label}</span>
      )}
    </div>
  );
}
