import { motion } from "framer-motion";
import { TrendingUp, Briefcase, Heart, Brain, Cloud } from "lucide-react";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 10 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.4, delay },
});

const SVG_PATH = "M 0 55 C 30 30, 50 65, 80 45 C 110 25, 130 50, 160 40 C 190 60, 210 20, 240 50";

export function ExplainScreen3() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <motion.h1 {...fade(0)} className="font-display text-2xl text-on-surface leading-tight">
          Patterns emerge.
        </motion.h1>
        <motion.p {...fade(0.5)} className="text-on-surface-variant text-sm">
          The more you reflect, the more Loop sees.
        </motion.p>
      </div>

      {/* Echoes — mini theme cards grid */}
      <motion.div {...fade(1)} className="space-y-2">
        <span className="label-uppercase">Echoes</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Self-doubt", icon: Brain, color: "text-mint", mentions: 12 },
            { name: "Work stress", icon: Briefcase, color: "text-on-surface", mentions: 8 },
            { name: "Relationships", icon: Heart, color: "text-mint", mentions: 6 },
            { name: "Overthinking", icon: Cloud, color: "text-on-surface-variant", mentions: 5 },
          ].map((t, i) => (
            <motion.div
              key={t.name}
              {...fade(1.2 + i * 0.15)}
              className="rounded-2xl glass-panel p-3 flex flex-col gap-2 items-start border border-border/20"
            >
              <t.icon size={18} className={t.color} />
              <div>
                <p className="text-on-surface font-body font-semibold text-xs">{t.name}</p>
                <p className="text-on-surface-variant text-[10px]">{t.mentions} MENTIONS</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Mini intensity graph */}
      <motion.div {...fade(2)} className="rounded-xl surface-high p-3">
        <svg viewBox="0 0 240 70" className="w-full h-[70px]" fill="none">
          <motion.path
            d={SVG_PATH}
            stroke="hsl(180, 25%, 80%)"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut", delay: 2.3 }}
          />
          <motion.path
            d={SVG_PATH + " L 240 70 L 0 70 Z"}
            fill="url(#mintGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ duration: 1, delay: 3.5 }}
          />
          <defs>
            <linearGradient id="mintGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(180, 25%, 80%)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
        <motion.p {...fade(3.5)} className="text-[10px] text-on-surface-variant text-center">
          This week
        </motion.p>
      </motion.div>

      {/* Fact vs Assumption mini bar */}
      <motion.div {...fade(3.8)} className="rounded-xl surface-low p-3 space-y-2">
        <span className="label-uppercase text-mint">Perspective</span>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-mint text-xs font-semibold">Facts</span>
              <span className="text-mint text-sm font-bold">62%</span>
            </div>
            <div className="h-1 rounded-full bg-surface-high overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-mint"
                initial={{ width: 0 }}
                animate={{ width: "62%" }}
                transition={{ duration: 0.8, delay: 4.2 }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-on-surface-variant text-xs font-semibold">Stories</span>
              <span className="text-on-surface-variant text-sm font-bold">38%</span>
            </div>
            <div className="h-1 rounded-full bg-surface-high overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-on-surface-variant"
                initial={{ width: 0 }}
                animate={{ width: "38%" }}
                transition={{ duration: 0.8, delay: 4.2 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pattern badge */}
      <motion.div
        {...fade(4.6)}
        className="surface-container rounded-xl px-4 py-2.5 flex items-center gap-3"
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.6, delay: 5 }}
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
