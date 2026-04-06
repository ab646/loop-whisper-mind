import { motion } from "framer-motion";
import {
  Heart, Briefcase, Brain, Shield, Users, Home, Clock,
  Flame, Target, Eye, Zap, Compass, Leaf, Moon, Sun,
  MessageCircle, TrendingUp, Lock, Lightbulb, Frown,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ThemeCardProps {
  name: string;
  mentions: number;
  icon?: string;
  delay?: number;
  colorIndex?: number;
}

// Keyword-to-icon mapping for semantic matching
const keywordIconMap: [string[], LucideIcon][] = [
  [["love", "relationship", "partner", "romance", "dating", "intimacy"], Heart],
  [["work", "job", "career", "boss", "office", "professional", "business"], Briefcase],
  [["family", "parent", "mother", "father", "child", "sibling", "home"], Home],
  [["friend", "social", "people", "community", "connection", "loneliness", "lonely"], Users],
  [["anxiety", "worry", "stress", "overwhelm", "pressure", "tension", "nervous"], Flame],
  [["identity", "self", "worth", "esteem", "confidence", "ego", "image"], Eye],
  [["control", "power", "autonomy", "freedom", "independence"], Shield],
  [["time", "deadline", "rush", "busy", "waiting", "patience"], Clock],
  [["goal", "ambition", "purpose", "direction", "success", "achievement"], Target],
  [["change", "growth", "transition", "evolving", "progress"], TrendingUp],
  [["fear", "scared", "afraid", "dread", "phobia"], Frown],
  [["energy", "motivation", "drive", "passion", "excitement"], Zap],
  [["meaning", "spiritual", "belief", "faith", "values"], Compass],
  [["rest", "sleep", "fatigue", "burnout", "exhaustion"], Moon],
  [["health", "body", "wellness", "healing", "nature"], Leaf],
  [["joy", "happiness", "gratitude", "optimism", "hope"], Sun],
  [["communication", "conflict", "conversation", "expression"], MessageCircle],
  [["boundary", "trust", "safety", "vulnerability", "secret"], Lock],
  [["creativity", "idea", "inspiration", "curiosity", "learning"], Lightbulb],
  [["mind", "thought", "thinking", "overthinking", "decision", "pattern"], Brain],
];

function getSemanticIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [keywords, icon] of keywordIconMap) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
  }
  return Brain; // default fallback
}

// Rotating accent colors using design tokens
const accentColors = [
  { icon: "text-mint", bg: "bg-mint/15" },
  { icon: "text-secondary", bg: "bg-secondary/15" },
  { icon: "text-tertiary-foreground", bg: "bg-tertiary/20" },
  { icon: "text-primary", bg: "bg-primary/15" },
];

export function ThemeCard({ name, mentions, delay = 0, colorIndex = 0 }: ThemeCardProps) {
  const Icon = getSemanticIcon(name);
  const navigate = useNavigate();
  const accent = accentColors[colorIndex % accentColors.length];

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={() => navigate(`/theme/${name.toLowerCase()}`)}
      className="rounded-2xl glass-panel p-4 flex flex-col gap-3 items-start text-left border border-border/20 hover:bg-surface-container transition-colors"
    >
      <div className={`w-10 h-10 rounded-xl ${accent.bg} flex items-center justify-center`}>
        <Icon size={20} className={accent.icon} />
      </div>
      <div>
        <p className="text-on-surface font-body font-semibold text-sm">{name}</p>
        <p className="text-on-surface-variant text-[10px] tracking-wider uppercase">{mentions} MENTIONS</p>
      </div>
    </motion.button>
  );
}
