import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mic, Heart, Briefcase, Brain, Users, Home, Clock,
  Flame, Target, Eye, Zap, Compass, MessageCircle, Shield,
  type LucideIcon,
} from "lucide-react";
import { CyclingLoader } from "@/components/CyclingLoader";
import { AppHeader } from "@/components/AppHeader";
import { ThemeCard } from "@/components/ThemeCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const triggerKeywords: [string[], LucideIcon][] = [
  [["conflict", "argument", "disagree", "fight", "tension"], Flame],
  [["deadline", "time", "rush", "late", "waiting"], Clock],
  [["rejection", "dismiss", "ignore", "abandon"], Heart],
  [["work", "job", "boss", "meeting", "office"], Briefcase],
  [["family", "parent", "child", "home"], Home],
  [["social", "people", "friend", "group", "crowd"], Users],
  [["decision", "choice", "uncertain", "doubt"], Brain],
  [["control", "power", "helpless", "boundary"], Shield],
  [["comparison", "jealous", "envy", "compete"], Eye],
  [["change", "transition", "unknown", "new"], Compass],
  [["message", "text", "email", "call", "notification"], MessageCircle],
  [["goal", "expect", "fail", "success", "pressure"], Target],
  [["energy", "overwhelm", "exhaust", "stress"], Zap],
];

function getTriggerIcon(label: string): LucideIcon {
  const lower = label.toLowerCase();
  for (const [keywords, icon] of triggerKeywords) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
  }
  return Brain;
}

export default function InsightsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entryCount, setEntryCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        // Fetch entry count for progress indicator
        const { count } = await supabase
          .from("entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id);
        setEntryCount(count ?? 0);

        const { data, error } = await supabase.functions.invoke("insights");
        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          setLoading(false);
          return;
        }
        setInsights(data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load insights");
      }
      setLoading(false);
    })();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient-bg flex items-center justify-center">
        <CyclingLoader mode="analysis" size={108} />
      </div>
    );
  }

  if (!insights || insights.isEmpty) {
    const threshold = 5;
    const progress = Math.min(entryCount, threshold);

    return (
      <div className="min-h-screen mesh-gradient-bg pb-24 pt-6">
        <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
            <h2 className="font-display text-2xl text-on-surface leading-tight">
              Patterns in the quiet.
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
              Reflect {threshold - progress} more time{threshold - progress !== 1 ? "s" : ""} to unlock your first patterns.
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 py-2">
              {Array.from({ length: threshold }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className={`w-3 h-3 rounded-full ${
                    i < progress ? "bg-mint" : "surface-high"
                  }`}
                />
              ))}
            </div>
            <p className="text-on-surface-variant text-xs">
              {progress} of {threshold} reflections
            </p>
          </motion.div>

          {/* Preview cards — blurred placeholder */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-sm space-y-3 opacity-30 blur-[2px] pointer-events-none"
          >
            <div className="rounded-2xl surface-low p-4 h-20" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl surface-low p-4 h-24" />
              <div className="rounded-2xl surface-low p-4 h-24" />
            </div>
            <div className="rounded-2xl surface-low p-4 h-16" />
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => navigate("/recording")}
            className="flex items-center gap-2 px-6 py-3 rounded-full orb-gradient text-primary-foreground font-semibold text-sm"
          >
            <Mic size={16} />
            Start a reflection
          </motion.button>
        </div>
      </div>
    );
  }

  const themes = insights.themes || [];
  const triggers = insights.triggers || [];
  const factPercent = insights.factPercent ?? 50;
  const assumptionPercent = 100 - factPercent;

  return (
    <div className="min-h-screen mesh-gradient-bg pb-24 pt-6 relative overflow-hidden">
      {/* Background haze */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute top-[45%] left-[25%] w-[350px] h-[350px] rounded-full bg-secondary/[0.04] blur-[100px]" />
        <div className="absolute top-[75%] left-[65%] w-[300px] h-[300px] rounded-full bg-tertiary/[0.03] blur-[110px]" />
      </div>

      <div className="px-5 space-y-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h2 className="font-display text-2xl text-on-surface leading-tight">
            Patterns in the quiet.
          </h2>
          {insights.weeklyInsight && (
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {insights.weeklyInsight}
            </p>
          )}
        </motion.div>

        {themes.length > 0 && (
          <div className="space-y-3">
            <span className="label-uppercase">ECHOES</span>
            <h3 className="font-display text-lg text-on-surface">Top recurring themes</h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.slice(0, 4).map((t: any, i: number) => (
                <ThemeCard key={t.name} name={t.name} mentions={t.mentions} icon={t.icon || "cloud"} delay={i * 0.08} colorIndex={i} />
              ))}
            </div>
            {themes.length > 4 && (
              <button
                onClick={() => navigate("/themes")}
                className="text-mint text-sm font-body hover:underline py-2"
              >
                See all {themes.length} themes →
              </button>
            )}
          </div>
        )}

        {triggers.length > 0 && (
          <div className="space-y-3">
            <span className="label-uppercase">CATALYSTS</span>
            <h3 className="font-display text-lg text-on-surface">Common triggers</h3>
            <div className="space-y-2">
              {triggers.map((t: any, i: number) => {
                const Icon = getTriggerIcon(t.label);
                const colorClasses = [
                  { bg: "bg-secondary/15", text: "text-secondary" },
                  { bg: "bg-tertiary/20", text: "text-tertiary-foreground" },
                  { bg: "bg-mint/15", text: "text-mint" },
                ];
                const color = colorClasses[i % colorClasses.length];
                return (
                  <div key={t.label} className="rounded-2xl surface-low p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color.bg}`}>
                      <Icon size={18} className={color.text} />
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
        )}

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
                <span className="text-mint text-lg font-bold">{factPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                <div className="h-full rounded-full bg-mint" style={{ width: `${factPercent}%` }} />
              </div>
              {insights.factExample && (
                <p className="text-on-surface-variant text-xs italic font-display">"{insights.factExample}"</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-on-surface-variant text-sm font-semibold">Assumptions</span>
                <span className="text-on-surface-variant text-lg font-bold">{assumptionPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                <div className="h-full rounded-full bg-on-surface-variant" style={{ width: `${assumptionPercent}%` }} />
              </div>
              {insights.assumptionExample && (
                <p className="text-on-surface-variant text-xs italic font-display">"{insights.assumptionExample}"</p>
              )}
            </div>
          </div>
          {insights.improvementNote && (
            <div className="rounded-xl surface-container p-4 flex items-start gap-3 mt-2">
              <span className="text-lg">💡</span>
              <p className="text-on-surface text-sm leading-relaxed">{insights.improvementNote}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
