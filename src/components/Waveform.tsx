import { motion, useReducedMotion } from "framer-motion";

interface WaveformProps {
  bars?: number;
  active?: boolean;
}

export function Waveform({ bars = 15, active = true }: WaveformProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-on-surface-variant"
          animate={
            active && !prefersReduced
              ? {
                  height: [8, 12 + Math.random() * 20, 8],
                }
              : { height: active ? 14 : 8 }
          }
          transition={
            prefersReduced
              ? { duration: 0 }
              : {
                  duration: 0.6 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.05,
                }
          }
        />
      ))}
    </div>
  );
}
