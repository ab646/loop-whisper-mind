import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Mail, VolumeX } from "lucide-react";
import { CyclingLoader } from "@/components/CyclingLoader";
import { AppHeader } from "@/components/AppHeader";
import { ThemeCard } from "@/components/ThemeCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const iconTypeMap: Record<string, "message" | "mail" | "silence"> = {
  message: "message",
  mail: "mail",
  silence: "silence",
};

const triggerIconMap = {
  message: MessageSquare,
  mail: Mail,
  silence: VolumeX,
};

export default function InsightsPage() {
  const { session } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
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
        <CyclingLoader mode="analysis" size={20} />
      </div>
    );
  }

  if (!insights || insights.isEmpty) {
    return (
      <div className="min-h-screen mesh-gradient-bg pb-24 pt-6">
        <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <h2 className="font-display text-2xl text-on-surface leading-tight">
              Patterns in the quiet.
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
              Once you have a few entries, I'll start noticing what's repeating, what's assumed, and what patterns keep showing up.
            </p>
            <p className="text-mint text-sm italic font-display">
              Start a loop to begin.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const themes = insights.themes || [];
  const triggers = insights.triggers || [];
  const factPercent = insights.factPercent ?? 50;
  const assumptionPercent = 100 - factPercent;

  return (
    <div className="min-h-screen mesh-gradient-bg pb-24 pt-6">
      

      <div className="px-5 space-y-8">
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
              {themes.map((t: any, i: number) => (
                <ThemeCard key={t.name} name={t.name} mentions={t.mentions} icon={t.icon || "cloud"} delay={i * 0.08} />
              ))}
            </div>
          </div>
        )}

        {triggers.length > 0 && (
          <div className="space-y-3">
            <span className="label-uppercase">CATALYSTS</span>
            <h3 className="font-display text-lg text-on-surface">Common triggers</h3>
            <div className="space-y-2">
              {triggers.map((t: any) => {
                const Icon = triggerIconMap[t.iconType as keyof typeof triggerIconMap] || MessageSquare;
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
