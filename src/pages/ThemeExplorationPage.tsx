import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, HeartCrack, Briefcase, Calendar, ArrowUp, Users, Clock, MessageCircle, Shield, Brain, Eye, Flame, AlertTriangle, CloudRain, Zap, Target, Lock, Phone, Moon, BatteryLow, Scale, HandHeart, Ghost, VolumeX, Compass, Hourglass, AlarmClock } from "lucide-react";
import { ScribblingLogo } from "@/components/LoopLogo";
import { CyclingLoader } from "@/components/CyclingLoader";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { AppHeader } from "@/components/AppHeader";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const triggerIcons: Record<string, any> = {
  heart: Heart,
  "heart-crack": HeartCrack,
  briefcase: Briefcase,
  calendar: Calendar,
  users: Users,
  people: Users,
  clock: Clock,
  "message-circle": MessageCircle,
  message: MessageCircle,
  shield: Shield,
  brain: Brain,
  eye: Eye,
  flame: Flame,
  alert: AlertTriangle,
  "cloud-rain": CloudRain,
  zap: Zap,
  target: Target,
  lock: Lock,
  phone: Phone,
  moon: Moon,
  "battery-low": BatteryLow,
  scale: Scale,
  "hand-heart": HandHeart,
  ghost: Ghost,
  "volume-x": VolumeX,
  compass: Compass,
  hourglass: Hourglass,
  "alarm-clock": AlarmClock,
};
const triggerColors: Record<string, string> = {
  heart: "text-pink-300",
  "heart-crack": "text-pink-400",
  briefcase: "text-amber-300",
  calendar: "text-on-surface-variant",
  users: "text-blue-300",
  people: "text-blue-300",
  clock: "text-orange-300",
  "message-circle": "text-teal-300",
  message: "text-teal-300",
  shield: "text-emerald-300",
  brain: "text-purple-300",
  eye: "text-cyan-300",
  flame: "text-red-300",
  alert: "text-yellow-300",
  "cloud-rain": "text-slate-300",
  zap: "text-yellow-200",
  target: "text-red-200",
  lock: "text-on-surface-variant",
  phone: "text-green-300",
  moon: "text-indigo-300",
  "battery-low": "text-orange-400",
  scale: "text-on-surface-variant",
  "hand-heart": "text-pink-200",
  ghost: "text-slate-400",
  "volume-x": "text-on-surface-variant",
  compass: "text-teal-200",
  hourglass: "text-amber-200",
  "alarm-clock": "text-red-300",
};

export default function ThemeExplorationPage() {
  const { id: theme } = useParams();
  const { session } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session || !theme) return;
    analytics.themePageViewed(theme);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, askingQuestion]);

  const askQuestion = async (question: string) => {
    if (!question.trim() || !session?.user?.id) return;
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setShowSuggestions(false);
    setAskingQuestion(true);
    setInput("");
    try {
      const { data, error } = await supabase.functions.invoke("explore-theme", {
        body: { theme, question },
      });
      if (error) throw error;
      const answer = data?.answer || data?.connectedBelief || "I couldn't generate a reflection for that.";
      setChatMessages((prev) => [...prev, { role: "ai", content: answer }]);

      // Fix #11: Removed entry creation — exploration chat stays in component state only
    } catch (e) {
      toast.error("Failed to get answer");
    }
    setAskingQuestion(false);
  };

  if (loading) {
    return <FullScreenLoader mode="analysis" />;
  }

  const themeName = theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "Theme";

  return (
    <div className="h-screen mesh-gradient-bg flex flex-col overflow-hidden">
      <AppHeader title={themeName} showBack />

      <div className="flex-1 scroll-container px-5 space-y-6" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 80px)' }}>
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
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {analysis.beliefTags.map((tag: string) => (
                    <span key={tag} className="tag-pill">
                      {tag.replace(/_/g, " ").trim().toLowerCase().replace(/^\w/, (char) => char.toUpperCase())}
                    </span>
                  ))}
                </div>
                <FeedbackButtons
                  contentType="connected-belief"
                  contentId={`belief-${theme}`}
                  contentPreview={analysis.connectedBelief}
                />
              </div>
            )}
            {!analysis.beliefTags?.length && (
              <div className="flex justify-end">
                <FeedbackButtons
                  contentType="connected-belief"
                  contentId={`belief-${theme}`}
                  contentPreview={analysis.connectedBelief}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Atmosphere Timeline — Fix #10: removed "Last 7 Days" button */}
        {analysis?.frequencyData?.length > 0 && analysis.frequencyData.reduce((sum: number, d: any) => sum + d.count, 0) >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl surface-low p-5 space-y-4"
          >
            <div>
              <h3 className="font-display text-lg text-on-surface leading-snug">Intensity trends over time</h3>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analysis.frequencyData} margin={{ top: 16, right: 20, bottom: 0, left: 8 }}>
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
                     domain={[0, 5.5]}
                     ticks={[1, 2, 3, 4, 5]}
                     tick={{ fill: "hsl(var(--on-surface-variant))", fontSize: 9 }}
                     tickLine={false}
                     axisLine={false}
                     width={52}
                     tickFormatter={(v: number) => {
                       const labels: Record<number, string> = { 1: "Mild", 2: "Moderate", 3: "Elevated", 4: "Spiral", 5: "Crisis" };
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
                      const [y, m, d] = v.split("-").map(Number);
                      const date = new Date(y, m - 1, d);
                      return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
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
              <div className="flex justify-end">
                <FeedbackButtons
                  contentType="pattern-insight"
                  contentId={`pattern-${theme}`}
                  contentPreview={analysis.patternInsight}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Deepen the exploration — Chat */}
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
              <h3 className="text-on-surface font-body font-semibold text-base">What the data shows</h3>
              <p className="text-on-surface-variant text-sm">Observations from your entries about {themeName}.</p>
            </div>
          </div>

          <div className="rounded-2xl surface-low p-4 space-y-3">
            {/* Suggestion chips */}
            {showSuggestions && (analysis?.followUpQuestions || []).map((q: string) => (
              <button
                key={q}
                onClick={() => askQuestion(q)}
                disabled={askingQuestion}
                className="w-full text-left rounded-xl surface-high px-4 py-3 text-on-surface text-sm font-body leading-relaxed hover:border-mint/40 transition-colors border border-border/20 disabled:opacity-50"
              >
                {q}
              </button>
            ))}

            {/* Chat thread */}
            {chatMessages.length > 0 && (
              <div className="space-y-3">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="rounded-2xl surface-high px-4 py-3 max-w-[85%]">
                          <p className="text-on-surface text-sm leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl p-4 space-y-2 border-l-4 border-mint/30 surface-container">
                        <span className="label-uppercase text-mint">Reflection</span>
                        <p className="text-on-surface text-sm leading-relaxed font-body">{msg.content}</p>
                        <div className="flex justify-end">
                          <FeedbackButtons
                            contentType="exploration-answer"
                            contentId={`explore-${theme}-${i}`}
                            contentPreview={msg.content}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {askingQuestion && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 py-2"
                  >
                    <CyclingLoader mode="reflection" size={20} layout="inline" />
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}


          </div>
        </motion.div>
      </div>

      {/* Fixed input above keyboard */}
      <div
        className="fixed left-0 right-0 z-40 px-4"
        style={{ bottom: 'max(var(--keyboard-height), calc(var(--bottom-nav-height) + 12px))' }}
      >
        <div className="flex items-center gap-2 rounded-xl surface-high px-4 py-3 border border-border/20 shadow-lg">
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
              <ScribblingLogo size={14} />
            ) : (
              <ArrowUp size={14} className="text-primary-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}