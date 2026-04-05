import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VoiceOrb } from "@/components/VoiceOrb";

export default function ThemeExplorationEmptyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen mesh-gradient-bg pb-24 flex flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Menu size={20} className="text-on-surface-variant" />
          <h1 className="font-display text-xl text-mint italic">Loop</h1>
        </div>
        <div className="w-9 h-9 rounded-full surface-high" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-24 h-24 rounded-full surface-low flex items-center justify-center"
        >
          <span className="text-on-surface-variant text-3xl">🧩</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-3"
        >
          <h2 className="font-display text-2xl text-on-surface leading-tight">
            A deeper look at what repeats.
          </h2>
          <p className="font-display text-base text-mint italic">
            Your recurring themes will appear here as you talk things out.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3"
        >
          <div className="w-3 h-3 rounded-full border-2 border-mint animate-pulse-soft" />
          <span className="label-uppercase text-[10px]">WAITING FOR FIRST RESONANCE</span>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/")}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full surface-high flex items-center justify-center">
            <span className="text-mint text-lg">💬</span>
          </div>
          <span className="label-uppercase text-mint text-[10px]">GO TO CHAT</span>
        </motion.button>
      </div>
    </div>
  );
}
