import { motion } from "framer-motion";
import { Menu, MessageSquare, Moon, Mail, VolumeX } from "lucide-react";
import { ThemeCard } from "@/components/ThemeCard";

const themes = [
  { name: "Ambiguity", mentions: 12, icon: "cloud" as const },
  { name: "Rejection", mentions: 8, icon: "heart" as const },
  { name: "Work Anxiety", mentions: 15, icon: "briefcase" as const },
  { name: "Self-doubt", mentions: 5, icon: "alert" as const },
];

const triggers = [
  { label: "Late-night texts", detail: "CORRELATES TO SPIKES AT 11PM", icon: MessageSquare },
  { label: "Ambiguous emails", detail: "OFTEN TRIGGERS WORK ANXIETY", icon: Mail },
  { label: "Sudden silences", detail: "LINKED TO AMBIGUITY THEMES", icon: VolumeX },
];

export default function InsightsPage() {
  return (
    <div className="min-h-screen mesh-gradient-bg pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Menu size={20} className="text-on-surface-variant" />
          <h1 className="font-display text-xl text-on-surface font-semibold">Loop</h1>
        </div>
        <span className="text-mint font-body font-semibold text-sm">Patterns</span>
      </header>

      <div className="px-5 space-y-8">
        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h2 className="font-display text-2xl text-on-surface leading-tight">
            Patterns in the quiet.
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Reflecting on the emotional landscape of your week. These trends represent the space between your thoughts.
          </p>
        </motion.div>

        {/* Intensity chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl surface-low p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="label-uppercase text-mint">ATMOSPHERE</span>
              <h3 className="font-display text-lg text-on-surface mt-1">Intensity trends over time</h3>
            </div>
            <span className="text-on-surface-variant text-xs">Last 7<br />Days</span>
          </div>
          {/* Simple SVG chart */}
          <svg viewBox="0 0 300 80" className="w-full h-20">
            <path
              d="M 0 60 Q 30 55 60 50 Q 90 45 120 40 Q 150 35 180 38 Q 210 42 240 30 Q 270 25 300 35"
              fill="none"
              stroke="hsl(180, 25%, 80%)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 0 60 Q 30 55 60 50 Q 90 45 120 40 Q 150 35 180 38 Q 210 42 240 30 Q 270 25 300 35 L 300 80 L 0 80 Z"
              fill="url(#chartGrad)"
              opacity="0.1"
            />
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(180, 25%, 80%)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex justify-between text-on-surface-variant text-[10px] tracking-wider">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </motion.div>

        {/* Recurring themes */}
        <div className="space-y-3">
          <span className="label-uppercase">ECHOES</span>
          <h3 className="font-display text-lg text-on-surface">Top recurring themes</h3>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((t, i) => (
              <ThemeCard key={t.name} {...t} delay={i * 0.08} />
            ))}
          </div>
        </div>

        {/* Common triggers */}
        <div className="space-y-3">
          <span className="label-uppercase">CATALYSTS</span>
          <h3 className="font-display text-lg text-on-surface">Common triggers</h3>
          <div className="space-y-2">
            {triggers.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="rounded-2xl surface-low p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full surface-high flex items-center justify-center">
                    <Icon size={18} className="text-on-surface-variant" />
                  </div>
                  <div>
                    <p className="text-on-surface text-sm font-semibold">{t.label}</p>
                    <p className="text-on-surface-variant text-[10px] tracking-wider uppercase">{t.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fact vs Assumption */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl surface-low p-5 space-y-4"
        >
          <span className="label-uppercase text-mint">PERSPECTIVE</span>
          <h3 className="font-display text-lg text-on-surface">Fact vs Assumption Trends</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-mint text-sm font-semibold">Facts</span>
                <span className="text-mint text-lg font-bold">64%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                <div className="h-full w-[64%] rounded-full bg-mint" />
              </div>
              <p className="text-on-surface-variant text-xs italic font-display">
                "I haven't heard back yet."
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-on-surface-variant text-sm font-semibold">Assumptions</span>
                <span className="text-on-surface-variant text-lg font-bold">36%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                <div className="h-full w-[36%] rounded-full bg-on-surface-variant" />
              </div>
              <p className="text-on-surface-variant text-xs italic font-display">
                "They must be mad at me."
              </p>
            </div>
          </div>

          <div className="rounded-xl surface-container p-4 flex items-start gap-3 mt-2">
            <span className="text-lg">💡</span>
            <p className="text-on-surface text-sm leading-relaxed">
              You are identifying facts more clearly this week. Your assumption rate has decreased by 12% compared to last week.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
