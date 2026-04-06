import { motion } from "framer-motion";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 10 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.4, delay },
});

export function ExplainScreen2() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <motion.h1 {...fade(0)} className="font-display text-2xl text-on-surface leading-tight">
          Loop reflects.
        </motion.h1>
        <motion.p {...fade(0.5)} className="text-on-surface-variant text-sm">
          Your thoughts, mirrored back with clarity.
        </motion.p>
      </div>

      {/* Mini reflection card */}
      <motion.div
        {...fade(1)}
        className="rounded-2xl surface-low p-5 border-l-4 border-mint/30 space-y-4"
      >
        {/* One Question */}
        <motion.div {...fade(1.5)} className="space-y-1">
          <p className="label-uppercase text-[10px]">One Question</p>
          <p className="font-display text-lg text-mint italic leading-snug">
            "Is she evaluating you, or are you evaluating yourself?"
          </p>
        </motion.div>

        {/* Fact vs Story */}
        <motion.div {...fade(2.5)} className="space-y-2">
          <p className="label-uppercase text-[10px]">Fact vs Story</p>
          <motion.div {...fade(2.8)} className="flex items-start gap-2">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-mint shrink-0" />
            <span className="text-on-surface text-sm">Your manager gave feedback in a meeting</span>
          </motion.div>
          <motion.div {...fade(3.1)} className="flex items-start gap-2">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-on-surface-variant/40 shrink-0" />
            <span className="text-on-surface-variant text-sm italic">She thinks you're not ready</span>
          </motion.div>
        </motion.div>

        {/* Tag */}
        <motion.div {...fade(4)}>
          <span className="inline-block px-3 py-1.5 rounded-full surface-high text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            Self-doubt
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
