import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Briefcase, Calendar, Settings, Mic, ArrowUp } from "lucide-react";
import { useState } from "react";

const followUpQuestions = [
  "What changes when this person is involved?",
  "How does my body feel right before?",
  "Where did I first learn this rule?",
];

export default function ThemeExplorationPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");

  return (
    <div className="min-h-screen mesh-gradient-bg pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={() => navigate(-1)} className="text-on-surface-variant">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-body text-sm font-semibold text-on-surface">Exploring: Ambiguity</h2>
        <div className="w-9 h-9 rounded-full surface-high" />
      </header>

      <div className="px-5 space-y-6">
        {/* Hero question */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h1 className="font-display text-2xl text-on-surface leading-tight">
            Why does this keep coming up?
          </h1>
          <div className="w-16 h-1 rounded-full bg-mint" />
        </motion.div>

        {/* Connected beliefs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl surface-low p-5 space-y-4 relative"
        >
          <span className="label-uppercase">CONNECTED BELIEFS</span>
          <p className="font-display text-lg text-on-surface italic leading-relaxed">
            "If I don't have an immediate answer, <strong className="not-italic">I am unsafe.</strong>"
          </p>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full surface-high text-[10px] text-mint tracking-wider uppercase font-semibold">Safety-seeking</span>
            <span className="px-3 py-1 rounded-full surface-high text-[10px] text-mint tracking-wider uppercase font-semibold">Control</span>
          </div>
          <div className="absolute top-4 right-4">
            <Settings size={20} className="text-on-surface-variant/30" />
          </div>
        </motion.div>

        {/* Frequent triggers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl surface-low p-5 space-y-4"
        >
          <span className="label-uppercase">FREQUENT TRIGGERS</span>
          <div className="space-y-3">
            {[
              { icon: Heart, label: "Dating apps", color: "text-pink-300" },
              { icon: Briefcase, label: "Meeting with manager", color: "text-amber-300" },
              { icon: Calendar, label: "Unplanned weekends", color: "text-on-surface-variant" },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <t.icon size={18} className={t.color} />
                <span className="text-on-surface text-sm">{t.label}</span>
              </div>
            ))}
          </div>
          <p className="text-mint text-[10px] tracking-wider uppercase font-semibold">3 NEW ENTRIES THIS WEEK</p>
        </motion.div>

        {/* Deepen exploration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full orb-gradient flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-sm">✦</span>
            </div>
            <div>
              <h3 className="text-on-surface font-body font-semibold text-base">Deepen the exploration</h3>
              <p className="text-on-surface-variant text-sm">Ask a follow-up about how Ambiguity manifests.</p>
            </div>
          </div>

          <div className="rounded-2xl surface-low p-4 space-y-3">
            {followUpQuestions.map((q) => (
              <button
                key={q}
                className="w-full text-left rounded-xl surface-high px-4 py-3 text-on-surface-variant text-sm font-body hover:text-mint transition-colors border border-border/20"
              >
                {q}
              </button>
            ))}
            <div className="flex items-center gap-2 rounded-xl surface-high px-4 py-3 border border-border/20">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your own reflection..."
                className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant text-sm outline-none"
              />
              <button className="w-7 h-7 rounded-full orb-gradient flex items-center justify-center">
                <ArrowUp size={14} className="text-primary-foreground" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Pattern insight banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-surface-container to-surface-low" />
          <div className="relative p-5 space-y-2">
            <span className="label-uppercase text-mint">PATTERN INSIGHT</span>
            <p className="font-display text-lg text-on-surface leading-relaxed">
              This theme is 40% more active during work hours.
            </p>
          </div>
          <div className="absolute bottom-4 right-4">
            <div className="w-12 h-12 rounded-full orb-gradient flex items-center justify-center orb-shadow">
              <Mic size={18} className="text-primary-foreground" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
