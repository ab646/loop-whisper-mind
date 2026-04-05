import { motion } from "framer-motion";
import { MessageSquare, Mail, VolumeX } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
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
      <AppHeader />

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
