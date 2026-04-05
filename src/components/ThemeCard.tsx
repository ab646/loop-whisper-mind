import { motion } from "framer-motion";
import { Cloud, Heart, Briefcase, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ThemeCardProps {
  name: string;
  mentions: number;
  icon?: "cloud" | "heart" | "briefcase" | "alert";
  delay?: number;
}

const iconMap = {
  cloud: Cloud,
  heart: Heart,
  briefcase: Briefcase,
  alert: AlertCircle,
};

const iconColorMap = {
  cloud: "text-pink-300",
  heart: "text-green-300",
  briefcase: "text-amber-300",
  alert: "text-red-300",
};

export function ThemeCard({ name, mentions, icon = "cloud", delay = 0 }: ThemeCardProps) {
  const Icon = iconMap[icon];
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={() => navigate(`/theme/${name.toLowerCase()}`)}
      className="rounded-2xl surface-low p-4 flex flex-col gap-3 items-start text-left hover:bg-surface-container transition-colors"
    >
      <Icon size={24} className={iconColorMap[icon]} />
      <div>
        <p className="text-on-surface font-body font-semibold text-sm">{name}</p>
        <p className="text-on-surface-variant text-xs">{mentions} MENTIONS</p>
      </div>
    </motion.button>
  );
}
