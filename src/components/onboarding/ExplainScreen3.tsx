import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 10 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.4, delay },
});

const SVG_PATH = "M 0 55 C 30 30, 50 65, 80 45 C 110 25, 130 50, 160 40 C 190 60, 210 20, 240 50";

export function ExplainScreen3() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <motion.h1 {...fade(0)} className="font-display text-2xl text-on-surface leading-tight">
          Patterns emerge.
        </motion.h1>
        <motion.p {...fade(0.5)} className="text-on-surface-variant text-sm">
          The more you reflect, the more Loop sees.
        </motion.p>
      </div>

      {/* Mini intensity graph */}
      <motion.div {...fade(1)} className="rounded-xl surface-high p-4">
        <svg viewBox="0 0 240 80" className="w-full h-[100px]" fill="none">
          <motion.path
            d={SVG_PATH}
            stroke="hsl(180, 25%, 80%)"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut", delay: 1.3 }}
          />
          {/* Glow under the line */}
          <motion.path
            d={SVG_PATH + " L 240 80 L 0 80 Z"}
            fill="url(#mintGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ duration: 1, delay: 2.5 }}
          />
          <defs>
            <linearGradient id="mintGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(180, 25%, 80%)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
        <motion.p
          {...fade(2.5)}
          className="text-[10px] text-on-surface-variant text-center mt-1"
        >
          This week
        </motion.p>
      </motion.div>

      {/* Pattern badge */}
      <motion.div
        {...fade(3.3)}
        className="surface-container rounded-xl px-4 py-3 flex items-center gap-3"
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.6, delay: 3.7 }}
        >
          <TrendingUp size={14} className="text-mint" />
        </motion.div>
        <span className="text-on-surface text-sm">
          Work anxiety — rising, peaks on Sundays
        </span>
      </motion.div>
    </div>
  );
}
