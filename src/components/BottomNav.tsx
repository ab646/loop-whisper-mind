import { useLocation, useNavigate } from "react-router-dom";
import { Mic, BarChart3, User, Settings } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", label: "CHAT", icon: Mic },
  { path: "/insights", label: "PATTERNS", icon: BarChart3 },
  { path: "/profile", label: "PROFILE", icon: User },
  { path: "/settings", label: "SETTINGS", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on voice recording screen
  if (location.pathname === "/recording") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-border/30">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-1 py-2 px-3 min-w-[64px]"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-2xl orb-gradient opacity-20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={20}
                className={isActive ? "text-mint" : "text-on-surface-variant"}
              />
              <span
                className={`text-[10px] tracking-[0.1em] font-semibold ${
                  isActive ? "text-mint" : "text-on-surface-variant"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
