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

// Vibrant, distinct accent palettes
const accentColors = [
  { icon: "text-mint", bg: "bg-mint/20" },
  { icon: "text-[hsl(280,60%,70%)]", bg: "bg-[hsl(280,60%,70%)]/15" },   // lavender/purple
  { icon: "text-secondary", bg: "bg-secondary/20" },
  { icon: "text-[hsl(0,65%,60%)]", bg: "bg-[hsl(0,65%,60%)]/15" },       // coral/red
  { icon: "text-[hsl(45,80%,60%)]", bg: "bg-[hsl(45,80%,60%)]/15" },     // amber
  { icon: "text-tertiary-foreground", bg: "bg-tertiary/25" },
];

export function ThemeCard({ name, mentions, icon, delay = 0, colorIndex = 0 }: ThemeCardProps) {
  const Icon = resolveIcon(icon, name);
  const navigate = useNavigate();
  const accent = accentColors[colorIndex % accentColors.length];

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={() => navigate(`/theme/${name.toLowerCase()}`)}
      className="rounded-2xl surface-low p-5 flex flex-col gap-4 items-start text-left border border-border/10 hover:border-border/30 transition-colors min-h-[130px]"
    >
      <Icon size={28} className={accent.icon} />
      <div className="mt-auto">
        <p className="text-on-surface font-body font-semibold text-[15px]">{name}</p>
        <p className="text-on-surface-variant text-[10px] tracking-wider uppercase mt-0.5">{mentions} MENTIONS</p>
      </div>
    </motion.button>
  );
}
