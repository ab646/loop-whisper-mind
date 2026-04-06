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

      {/* Mini reflection card — mirrors real ReflectionCard structure */}
      <motion.div
        {...fade(1)}
        className="rounded-2xl glass-panel p-5 space-y-4 border-l-4 border-mint/30 border border-border/20"
      >
        {/* One Question */}
        <motion.div {...fade(1.5)} className="space-y-1.5">
          <span className="label-uppercase text-mint">One Question</span>
          <p className="font-display text-lg text-mint italic leading-relaxed">
            "Is she evaluating you, or are you evaluating yourself?"
          </p>
        </motion.div>

        {/* Main Loop */}
        <motion.div {...fade(2.2)} className="space-y-1.5">
          <span className="label-uppercase">Main Loop</span>
          <p className="text-on-surface text-sm leading-relaxed font-body">
            Replaying a manager's feedback and interpreting it as a judgment on your readiness.
          </p>
        </motion.div>

        {/* Fact vs Story — matching real card style */}
        <motion.div {...fade(2.8)} className="border-t border-border/20 pt-3 space-y-3">
          <span className="label-uppercase">Fact vs Story</span>

          {/* Fact */}
          <motion.div {...fade(3.1)} className="space-y-1.5">
            <span className="label-uppercase text-mint text-[10px]">Fact</span>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-mint mt-1.5 shrink-0" />
              <span className="text-on-surface text-sm">Your manager gave feedback in a meeting</span>
            </div>
          </motion.div>

          {/* Story — left border, no bullet, italic */}
          <motion.div {...fade(3.5)} className="space-y-1.5">
            <span className="label-uppercase text-on-surface-variant text-[10px]">Story</span>
            <div className="border-l-2 border-on-surface-variant/30 pl-3">
              <p className="text-on-surface-variant text-sm italic">She thinks you're not ready</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Tag */}
        <motion.div {...fade(4)} className="pt-1">
          <span className="inline-block px-3 py-1.5 rounded-full surface-high text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            Self-doubt
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
