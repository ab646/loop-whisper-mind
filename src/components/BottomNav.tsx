import { useLocation, useNavigate } from "react-router-dom";
import { Mic, BarChart3, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", label: "CHAT", icon: Mic },
  { path: "/insights", label: "PATTERNS", icon: BarChart3 },
  { path: "/profile", label: "PROFILE", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/recording" || location.pathname.startsWith("/chat/")) return null;

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
              className="relative flex flex-col items-center gap-1 py-2 px-5 min-w-[72px]"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full orb-gradient orb-shadow"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={20}
                className={`relative z-10 ${isActive ? "text-primary-foreground" : "text-on-surface-variant"}`}
              />
              <span
                className={`relative z-10 text-[10px] tracking-[0.1em] font-semibold ${
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
