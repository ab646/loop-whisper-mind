import { motion } from "framer-motion";
import {
  Heart, HeartCrack, Briefcase, Brain, Shield, Users, Home, Clock,
  Flame, Target, Eye, Zap, Compass, Leaf, Moon, Sun, Ghost,
  MessageCircle, TrendingUp, Lock, Lightbulb, Frown, Cloud,
  CloudRain, BatteryLow, AlertCircle, HelpCircle, UserX,
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

// Broad icon map covering AI-returned icon names
const iconMap: Record<string, LucideIcon> = {
  cloud: Cloud,
  "cloud-rain": CloudRain,
  heart: Heart,
  "heart-crack": HeartCrack,
  briefcase: Briefcase,
  brain: Brain,
  shield: Shield,
  users: Users,
  "user-x": UserX,
  home: Home,
  clock: Clock,
  flame: Flame,
  target: Target,
  eye: Eye,
  zap: Zap,
  compass: Compass,
  leaf: Leaf,
  moon: Moon,
  sun: Sun,
  ghost: Ghost,
  "message-circle": MessageCircle,
  "trending-up": TrendingUp,
  lock: Lock,
  lightbulb: Lightbulb,
  frown: Frown,
  "battery-low": BatteryLow,
  "alert-circle": AlertCircle,
  "help-circle": HelpCircle,
  alert: AlertCircle,
};

// Keyword fallback if icon prop doesn't match
const keywordFallback: [string[], LucideIcon][] = [
  [["love", "relationship", "partner", "rejection", "abandon"], HeartCrack],
  [["work", "job", "career", "boss", "office", "professional"], Briefcase],
  [["family", "parent", "mother", "father", "child", "home"], Home],
  [["friend", "social", "people", "lonely", "loneliness"], Users],
  [["anxiety", "worry", "stress", "overwhelm", "pressure"], Flame],
  [["identity", "self", "worth", "doubt", "confidence"], UserX],
  [["control", "power", "autonomy", "boundary"], Shield],
  [["ambiguity", "uncertain", "unclear", "vague", "unknown"], Cloud],
  [["fear", "scared", "dread"], Ghost],
  [["time", "deadline", "rush", "waiting"], Clock],
  [["goal", "ambition", "purpose", "success"], Target],
  [["energy", "motivation", "burnout", "exhaust"], BatteryLow],
  [["change", "growth", "transition"], Compass],
  [["communication", "conflict", "conversation"], MessageCircle],
  [["creativity", "idea", "inspiration"], Lightbulb],
];

function resolveIcon(icon?: string, name?: string): LucideIcon {
  if (icon && iconMap[icon]) return iconMap[icon];
  if (name) {
    const lower = name.toLowerCase();
    for (const [kws, ic] of keywordFallback) {
      if (kws.some((kw) => lower.includes(kw))) return ic;
    }
  }
  return Brain;
}

// Consistent secondary badge style
const badgeClasses = { icon: "text-secondary", bg: "bg-secondary/15" };

export function ThemeCard({ name, mentions, icon, delay = 0, colorIndex = 0 }: ThemeCardProps) {
  const Icon = resolveIcon(icon, name);
  const navigate = useNavigate();

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
