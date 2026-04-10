import { motion, useReducedMotion } from "framer-motion";

interface WaveformProps {
  bars?: number;
  active?: boolean;
  /** Real-time levels (0-1) per bar. When provided, drives bar heights directly. */
  levels?: number[];
}

export function Waveform({ bars = 15, active = true, levels }: WaveformProps) {
  const prefersReduced = useReducedMotion();
  const hasRealData = levels && levels.length > 0;

  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {Array.from({ length: bars }).map((_, i) => {
        // If we have real audio data, use it
        if (hasRealData) {
          const level = levels[i] ?? 0;
          const h = 4 + level * 40; // 4px min, 44px max
          return (
            <motion.div
              key={i}
              className="w-[3px] rounded-full bg-on-surface-variant"
              animate={{ height: active ? h : 4 }}
              transition={{ duration: 0.05, ease: "linear" }}
            />
          );
        }

        // Fallback: animated placeholder
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-on-surface-variant"
            animate={
              active && !prefersReduced
                ? { height: [8, 12 + Math.random() * 20, 8] }
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
        );
      })}
    </div>
  );
}
