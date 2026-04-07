import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, BarChart3, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", label: "REFLECT", icon: MessageCircle },
  { path: "/insights", label: "PATTERNS", icon: BarChart3 },
  { path: "/profile", label: "PROFILE", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/recording", "/login", "/signup", "/onboarding", "/forgot-password", "/reset-password"];
  const hiddenPrefixes: string[] = [];

  const shouldHide =
    hiddenPaths.includes(location.pathname) ||
    hiddenPrefixes.some((prefix) => location.pathname.startsWith(prefix));

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-border/30">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-1 py-3 px-6 min-w-[72px]"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-x-0 top-0 bottom-0 rounded-2xl bg-surface-high"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={20}
                className={`relative z-10 ${isActive ? "text-mint" : "text-on-surface-variant"}`}
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