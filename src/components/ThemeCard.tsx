import { motion } from "framer-motion";
import { Cloud, Heart, Briefcase, AlertCircle, Brain, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ThemeCardProps {
  name: string;
  mentions: number;
  icon?: string;
  delay?: number;
}

const iconMap = {
  cloud: Cloud,
  heart: Heart,
  briefcase: Briefcase,
  alert: AlertCircle,
  brain: Brain,
  shield: Shield,
};

const iconColorMap = {
  cloud: "text-on-surface-variant",
  heart: "text-mint",
  briefcase: "text-on-surface",
  alert: "text-destructive",
  brain: "text-mint",
  shield: "text-on-surface-variant",
};

export function ThemeCard({ name, mentions, icon = "cloud", delay = 0 }: ThemeCardProps) {
  const safeIcon = icon in iconMap ? (icon as keyof typeof iconMap) : "cloud";
  const Icon = iconMap[safeIcon];
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={() => navigate(`/theme/${name.toLowerCase()}`)}
      className="rounded-2xl glass-panel p-4 flex flex-col gap-3 items-start text-left border border-border/20 hover:bg-surface-container transition-colors"
    >
      <Icon size={24} className={iconColorMap[safeIcon]} />
      <div>
        <p className="text-on-surface font-body font-semibold text-sm">{name}</p>
        <p className="text-on-surface-variant text-xs">{mentions} MENTIONS</p>
      </div>
    </motion.button>
  );
}
