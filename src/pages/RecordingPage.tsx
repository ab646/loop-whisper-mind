import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Mic } from "lucide-react";
import { VoiceOrb } from "@/components/VoiceOrb";
import { Waveform } from "@/components/Waveform";

export default function RecordingPage() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleStop = () => {
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen mesh-gradient-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={() => navigate("/")} className="text-on-surface-variant">
          <X size={24} />
        </button>
        <h2 className="font-display text-lg text-mint">Reflecting</h2>
        <div className="w-6" />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
        <div className="text-center space-y-2">
          <span className="label-uppercase">VOICE INPUT</span>
          <h1 className="font-display text-2xl text-on-surface italic">
            Recording Brain Dump...
          </h1>
        </div>

        <Waveform bars={20} active />

        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative"
        >
          <VoiceOrb size="lg" />
          <div className="absolute inset-0 flex items-center justify-center pt-12">
            <span className="text-primary-foreground text-lg font-body font-semibold">
              {formatTime(seconds)}
            </span>
          </div>
        </motion.div>

        <p className="font-display text-base text-mint italic text-center leading-relaxed max-w-xs">
          "Keep speaking. Don't worry about the structure, I'm capturing the essence..."
        </p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleStop}
          className="w-full max-w-xs rounded-2xl orb-gradient py-4 text-center text-primary-foreground font-body font-semibold tracking-wider text-sm uppercase"
        >
          Stop & Process
        </motion.button>
      </div>

      {/* Bottom minimal controls */}
      <div className="flex items-center justify-center gap-8 py-6">
        <div className="w-12 h-12 rounded-full surface-high flex items-center justify-center">
          <Mic size={18} className="text-on-surface-variant" />
        </div>
      </div>
    </div>
  );
}
