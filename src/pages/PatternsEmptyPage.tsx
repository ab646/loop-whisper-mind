import { motion } from "framer-motion";
import { Menu, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VoiceOrb } from "@/components/VoiceOrb";

export default function PatternsEmptyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen mesh-gradient-bg pb-24 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Menu size={20} className="text-on-surface-variant" />
          <h1 className="font-display text-xl text-mint italic">Loop</h1>
        </div>
        <div className="w-9 h-9 rounded-full surface-high" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-2 text-center"
        >
          <h2 className="font-display text-3xl text-on-surface leading-tight">
            Your patterns are{" "}
            <span className="text-mint italic">waiting to be seen.</span>
          </h2>
          <p className="text-on-surface-variant text-base leading-relaxed mt-4">
            Once you start talking through your loops, I'll begin mapping your mental landscape.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <VoiceOrb size="lg" onClick={() => navigate("/recording")} label="START A BRAIN DUMP" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3 w-full max-w-xs"
        >
          <div className="rounded-2xl surface-low p-4 space-y-2">
            <span className="label-uppercase text-[10px]">PATTERN HINT</span>
            <div className="h-1.5 w-16 rounded-full surface-high" />
          </div>
          <div className="rounded-2xl surface-low p-4 space-y-2">
            <span className="label-uppercase text-[10px]">REJECTION SENSITIVITY</span>
            <div className="h-1.5 w-12 rounded-full surface-high" />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="font-display text-base text-mint italic text-center mt-4"
        >
          "The clarity you seek is already within you, just unmapped."
        </motion.p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-3 mt-4"
        >
          <div className="w-12 h-12 rounded-full surface-high flex items-center justify-center">
            <MessageSquare size={18} className="text-mint" />
          </div>
          <span className="label-uppercase text-mint">GO TO CHAT</span>
        </motion.button>
      </div>
    </div>
  );
}
