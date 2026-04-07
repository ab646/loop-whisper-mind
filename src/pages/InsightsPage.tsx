import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle, Heart, HeartCrack, Briefcase, Brain, Users, Home, Clock,
  Flame, Target, Eye, Zap, Compass, Shield,
  Ghost, Moon, Lock, Leaf, Sun, BatteryLow, AlertCircle,
  CloudRain, Cloud, Mail, VolumeX, Calendar, Phone,
  type LucideIcon,
} from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { AppHeader } from "@/components/AppHeader";
import { ThemeCard } from "@/components/ThemeCard";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const triggerIconMap: Record<string, LucideIcon> = {
  "message-circle": MessageCircle,
  message: MessageCircle,
  mail: Mail,
  "volume-x": VolumeX,
  silence: VolumeX,
  calendar: Calendar,
  clock: Clock,
  users: Users,
  people: Users,
  flame: Flame,
  heart: Heart,
  "heart-crack": HeartCrack,
  briefcase: Briefcase,
  home: Home,
  brain: Brain,
  shield: Shield,
  eye: Eye,
  compass: Compass,
  target: Target,
  zap: Zap,
  ghost: Ghost,
  lock: Lock,
  phone: Phone,
  moon: Moon,
  "battery-low": BatteryLow,
  "alert-circle": AlertCircle,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  leaf: Leaf,
  sun: Sun,
};

function resolveTriggerIcon(iconType?: string, label?: string): LucideIcon {
  if (iconType && triggerIconMap[iconType]) return triggerIconMap[iconType];
  if (label) {
    const lower = label.toLowerCase();
    const kwMap: [string[], LucideIcon][] = [
      [["text", "message", "chat", "notification"], MessageCircle],
      [["email", "mail"], Mail],
      [["silence", "quiet", "mute", "ghost"], VolumeX],
      [["deadline", "time", "late", "night"], Clock],
      [["work", "job", "boss", "meeting", "office"], Briefcase],
      [["reject", "dismiss", "ignore", "abandon"], HeartCrack],
      [["family", "parent", "child", "home"], Home],
      [["social", "people", "friend", "crowd"], Users],
      [["decision", "uncertain", "doubt", "ambig"], Brain],
      [["control", "power", "boundary"], Shield],
      [["conflict", "argument", "fight", "tension"], Flame],
      [["goal", "expect", "fail", "pressure"], Target],
      [["energy", "overwhelm", "exhaust", "stress", "burnout"], Zap],
    ];
    for (const [kws, ic] of kwMap) {
      if (kws.some((kw) => lower.includes(kw))) return ic;
    }
  }
  return Brain;
}

export default function InsightsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entryCount, setEntryCount] = useState(0);
  const [showAllThemes, setShowAllThemes] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { count } = await supabase
          .from("entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id);
        const resolvedCount = count ?? 0;
        setEntryCount(resolvedCount);

        // Don't call the insights function until user has enough reflections —
        // avoids an error toast on the expected first-use empty state
        if (resolvedCount < 5) {
          setLoading(false);
          return; // insights stays null → empty state renders below
        }

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
      <FullScreenLoader mode="analysis" />
    );
  }

  if (!insights || insights.isEmpty) {
    const threshold = 5;
    const progress = Math.min(entryCount, threshold);

    return (
      <div className="h-screen mesh-gradient-bg flex flex-col overflow-hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
        <div className="flex-1 px-5 flex flex-col items-center justify-center gap-6">
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

          {/* CTA — Fix #9: changed to /chat/new with MessageCircle */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => navigate("/chat/new")}
            className="flex items-center gap-2 px-6 py-3 rounded-full orb-gradient text-primary-foreground font-semibold text-sm"
          >
            <MessageCircle size={16} />
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
    <div className="h-screen mesh-gradient-bg flex flex-col overflow-hidden relative">
      {/* Background haze */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute top-[45%] left-[25%] w-[350px] h-[350px] rounded-full bg-secondary/[0.04] blur-[100px]" />
        <div className="absolute top-[75%] left-[65%] w-[300px] h-[300px] rounded-full bg-tertiary/[0.03] blur-[110px]" />
      </div>

      <div className="flex-1 scroll-container pt-6 px-5 space-y-8 relative z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-3xl text-on-surface leading-tight tracking-tight">
            Patterns in the quiet.
          </h2>
        </motion.div>

        {insights.weeklyInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl surface-low p-5 space-y-2 border border-border/10"
          >
            <span className="label-uppercase">WEEKLY SUMMARY</span>
            <p className="text-on-surface text-[15px] leading-relaxed font-display">
              {insights.weeklyInsight}
            </p>
            <div className="flex justify-end">
              <FeedbackButtons
                contentType="weekly-summary"
                contentId={`weekly-${new Date().toISOString().split("T")[0]}`}
                contentPreview={insights.weeklyInsight}
              />
            </div>
          </motion.div>
        )}

        {themes.length > 0 && (
          <div className="space-y-3">
            <span className="label-uppercase">ECHOES</span>
            <h3 className="font-display text-lg text-on-surface">Top recurring themes</h3>
            <div className="grid grid-cols-2 gap-3">
              {(showAllThemes ? themes : themes.slice(0, 4)).map((t: any, i: number) => (
                <ThemeCard key={t.name} name={t.name} mentions={t.mentions} icon={t.icon || "cloud"} delay={i * 0.08} colorIndex={i} />
              ))}
            </div>
            {themes.length > 4 && !showAllThemes && (
              <button
                onClick={() => setShowAllThemes(true)}
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
                const Icon = resolveTriggerIcon(t.iconType, t.label);
                const triggerColors = [
                  { bg: "bg-secondary/25", text: "text-secondary" },
                  { bg: "bg-mint/20", text: "text-mint" },
                  { bg: "bg-[hsl(280,60%,70%)]/15", text: "text-[hsl(280,60%,70%)]" },
                  { bg: "bg-[hsl(0,65%,60%)]/15", text: "text-[hsl(0,65%,60%)]" },
                  { bg: "bg-[hsl(45,80%,60%)]/15", text: "text-[hsl(45,80%,60%)]" },
                ];
                const color = triggerColors[i % triggerColors.length];
                return (
                  <div key={t.label} className="rounded-2xl surface-low p-4 flex items-center gap-4 border border-border/10">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${color.bg}`}>
                      <Icon size={20} className={color.text} />
                    </div>
                    <div>
                      <p className="text-on-surface text-sm font-semibold">{t.label}</p>
                      <p className="text-on-surface-variant text-[10px] tracking-wider uppercase mt-0.5">{t.detail}</p>
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
                <span className="text-tertiary text-sm font-semibold">Assumptions</span>
                <span className="text-tertiary text-lg font-bold">{assumptionPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                <div className="h-full rounded-full bg-tertiary" style={{ width: `${assumptionPercent}%` }} />
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
