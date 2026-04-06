import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Briefcase, Calendar, Loader2, ArrowUp } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const triggerIcons: Record<string, any> = {
  heart: Heart,
  briefcase: Briefcase,
  calendar: Calendar,
};
const triggerColors: Record<string, string> = {
  heart: "text-pink-300",
  briefcase: "text-amber-300",
  calendar: "text-on-surface-variant",
};

export default function ThemeExplorationPage() {
  const { id: theme } = useParams();
  const { session } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !theme) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("explore-theme", {
          body: { theme },
        });
        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          setLoading(false);
          return;
        }
        setAnalysis(data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to explore theme");
      }
      setLoading(false);
    })();
  }, [session, theme]);

  const askQuestion = async (question: string) => {
    if (!question.trim()) return;
    setAskingQuestion(true);
    setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke("explore-theme", {
        body: { theme, question },
      });
      if (error) throw error;
      if (data?.answer) {
        setAnswer(data.answer);
      } else if (data?.connectedBelief) {
        setAnswer(data.connectedBelief);
      }
    } catch (e) {
      toast.error("Failed to get answer");
    }
    setAskingQuestion(false);
    setInput("");
  };

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient-bg flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-mint" size={20} />
          <span className="text-on-surface-variant text-sm italic font-display">Exploring {theme}...</span>
        </div>
      </div>
    );
  }

  const themeName = theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "Theme";

  return (
    <div className="min-h-screen mesh-gradient-bg pb-24">
      <AppHeader title={themeName} showBack />

      <div className="px-5 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h1 className="font-display text-2xl text-on-surface leading-tight">
            Why does this keep coming up?
          </h1>
          <div className="w-16 h-1 rounded-full bg-mint" />
        </motion.div>

        {analysis?.connectedBelief && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl surface-low p-5 space-y-4"
          >
            <span className="label-uppercase">CONNECTED BELIEFS</span>
            <p className="font-display text-lg text-on-surface italic leading-relaxed">
              "{analysis.connectedBelief}"
            </p>
            {analysis.beliefTags?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {analysis.beliefTags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 rounded-full surface-high text-[10px] text-mint tracking-wider uppercase font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Atmosphere Timeline */}
        {analysis?.frequencyData?.length > 0 && analysis.frequencyData.reduce((sum: number, d: any) => sum + d.count, 0) >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl surface-low p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg text-on-surface leading-snug">Intensity trends over time</h3>
              </div>
              <button className="text-on-surface-variant text-xs tracking-wide px-3 py-1.5 rounded-lg surface-high border border-border/20">
                Last 7 Days
              </button>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analysis.frequencyData} margin={{ top: 10, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(180, 25%, 80%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(180, 25%, 80%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--on-surface-variant))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tickFormatter={(v: string) => {
                      const [y, m, d] = v.split("-").map(Number);
                      const date = new Date(y, m - 1, d);
                      return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
                    }}
                  />
                  <YAxis
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tick={{ fill: "hsl(var(--on-surface-variant))", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    width={46}
                    tickFormatter={(v: number) => {
                      const labels: Record<number, string> = { 0: "", 1: "Low", 2: "", 3: "Mod", 4: "", 5: "High" };
                      return labels[v] ?? "";
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--surface-container))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "hsl(var(--on-surface))",
                    }}
                    labelFormatter={(v: string) => {
                      const d = new Date(v);
                      return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                    }}
                    formatter={(value: number) => {
                      const labels: Record<number, string> = { 0: "None", 1: "Low", 2: "Mild", 3: "Moderate", 4: "Strong", 5: "Extreme" };
                      return [labels[Math.round(value)] || `${value}`, "Intensity"];
                    }}
                  />
                  <Area
                    type="natural"
                    dataKey="intensity"
                    stroke="hsl(180, 25%, 80%)"
                    strokeWidth={3}
                    fill="url(#intensityGrad)"
                    dot={{ r: 3, fill: "hsl(180, 25%, 80%)", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "hsl(180, 25%, 80%)", strokeWidth: 2, stroke: "hsl(var(--surface-low))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {analysis?.triggers?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl surface-low p-5 space-y-4"
          >
            <span className="label-uppercase">FREQUENT TRIGGERS</span>
            <div className="space-y-3">
              {analysis.triggers.map((t: any) => {
                const Icon = triggerIcons[t.iconType] || Calendar;
                const color = triggerColors[t.iconType] || "text-on-surface-variant";
                return (
                  <div key={t.label} className="flex items-center gap-3">
                    <Icon size={18} className={color} />
                    <span className="text-on-surface text-sm">{t.label}</span>
                  </div>
                );
              })}
            </div>
            {analysis.entriesThisWeek != null && (
              <p className="text-mint text-[10px] tracking-wider uppercase font-semibold">
                {analysis.entriesThisWeek} ENTRIES THIS WEEK
              </p>
            )}
          </motion.div>
        )}

        {analysis?.patternInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-surface-container to-surface-low" />
            <div className="relative p-5 space-y-2">
              <span className="label-uppercase text-mint">PATTERN INSIGHT</span>
              <p className="font-display text-lg text-on-surface leading-relaxed">
                {analysis.patternInsight}
              </p>
            </div>
          </motion.div>
        )}

        {/* Follow-up questions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full orb-gradient flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-sm">✦</span>
            </div>
            <div>
              <h3 className="text-on-surface font-body font-semibold text-base">Deepen the exploration</h3>
              <p className="text-on-surface-variant text-sm">Ask a follow-up about how {themeName} manifests.</p>
            </div>
          </div>

          <div className="rounded-2xl surface-low p-4 space-y-3">
            {(analysis?.followUpQuestions || []).map((q: string) => (
              <button
                key={q}
                onClick={() => askQuestion(q)}
                disabled={askingQuestion}
                className="w-full text-left rounded-xl surface-high px-4 py-3 text-on-surface-variant text-sm font-body hover:text-mint transition-colors border border-border/20 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
            <div className="flex items-center gap-2 rounded-xl surface-high px-4 py-3 border border-border/20">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askQuestion(input)}
                placeholder="Type your own reflection..."
                className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant text-sm outline-none"
              />
              <button
                onClick={() => askQuestion(input)}
                disabled={!input.trim() || askingQuestion}
                className="w-7 h-7 rounded-full orb-gradient flex items-center justify-center disabled:opacity-50"
              >
                {askingQuestion ? (
                  <Loader2 size={12} className="animate-spin text-primary-foreground" />
                ) : (
                  <ArrowUp size={14} className="text-primary-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* AI Answer */}
          {answer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl surface-low p-5 space-y-2 border-l-4 border-mint/30"
            >
              <span className="label-uppercase text-mint">REFLECTION</span>
              <p className="text-on-surface text-sm leading-relaxed font-body">{answer}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
