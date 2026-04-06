import { motion } from "framer-motion";
import { Cloud, Heart, Briefcase, AlertCircle, Brain, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ThemeCardProps {
  name: string;
  mentions: number;
  icon?: string;
  delay?: number;
  colorIndex?: number;
}

const iconMap = {
  cloud: Cloud,
  heart: Heart,
  briefcase: Briefcase,
  alert: AlertCircle,
  brain: Brain,
  shield: Shield,
};

// Rotating accent colors using design tokens
const accentColors = [
  { icon: "text-mint", bg: "bg-mint/15" },
  { icon: "text-secondary", bg: "bg-secondary/15" },
  { icon: "text-tertiary", bg: "bg-tertiary/20" },
  { icon: "text-destructive", bg: "bg-destructive/15" },
];

export function ThemeCard({ name, mentions, icon = "cloud", delay = 0, colorIndex = 0 }: ThemeCardProps) {
  const safeIcon = icon in iconMap ? (icon as keyof typeof iconMap) : "cloud";
  const Icon = iconMap[safeIcon];
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
