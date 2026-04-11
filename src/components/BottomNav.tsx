import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useLayoutEffect, useRef } from "react";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);

  const hiddenPaths = ["/recording", "/login", "/signup", "/onboarding", "/forgot-password", "/reset-password"];

  const shouldHide =
    hiddenPaths.includes(location.pathname);

  useLayoutEffect(() => {
    if (shouldHide) {
      document.documentElement.style.setProperty("--bottom-nav-height", "0px");
      return;
    }

    const el = navRef.current;
    if (!el) return;

    const updateHeight = () => {
      const borderTopWidth = parseFloat(getComputedStyle(el).borderTopWidth) || 0;
      const height = el.getBoundingClientRect().height + borderTopWidth;
      document.documentElement.style.setProperty("--bottom-nav-height", `${height}px`);
    };

    updateHeight();

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldHide]);

  if (shouldHide) {
    return null;
  }

  const isJournalActive = location.pathname.startsWith("/journal");
  const isPatternsActive = location.pathname.startsWith("/insights") || location.pathname.startsWith("/theme");
  const isHomeActive = location.pathname === "/";

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-border/30">
      <div className="flex items-center justify-around px-6 py-2 max-w-md mx-auto" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {/* Journal tab */}
        <button
          onClick={() => navigate("/journal")}
          className="relative flex flex-col items-center gap-1 py-3 px-6 min-w-[72px]"
        >
          {isJournalActive && (
            <motion.div
              layoutId="nav-active"
              className="absolute inset-x-0 top-0 bottom-0 rounded-2xl bg-surface-high"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <BookOpen
            size={20}
            className={`relative z-10 ${isJournalActive ? "text-mint" : "text-on-surface-variant"}`}
          />
          <span
            className={`relative z-10 text-[10px] tracking-[0.1em] font-semibold ${
              isJournalActive ? "text-mint" : "text-on-surface-variant"
            }`}
          >
            JOURNAL
          </span>
        </button>

        {/* Center Voice Orb */}
        <button
          onClick={() => navigate(isHomeActive ? "/recording" : "/")}
          className="relative -mt-7 flex flex-col items-center"
        >
          <motion.div
            layoutId="voice-orb-nav"
            className="w-14 h-14 rounded-full orb-gradient orb-shadow flex items-center justify-center"
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.04 }}
          >
            <div className="w-5 h-5 rounded-full bg-primary-foreground/90" />
          </motion.div>
        </button>

        {/* Patterns tab */}
        <button
          onClick={() => navigate("/insights")}
          className="relative flex flex-col items-center gap-1 py-3 px-6 min-w-[72px]"
        >
          {isPatternsActive && (
            <motion.div
              layoutId="nav-active"
              className="absolute inset-x-0 top-0 bottom-0 rounded-2xl bg-surface-high"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <BarChart3
            size={20}
            className={`relative z-10 ${isPatternsActive ? "text-mint" : "text-on-surface-variant"}`}
          />
          <span
            className={`relative z-10 text-[10px] tracking-[0.1em] font-semibold ${
              isPatternsActive ? "text-mint" : "text-on-surface-variant"
            }`}
          >
            PATTERNS
          </span>
        </button>
      </div>
    </nav>
  );
}
