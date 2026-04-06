import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, Pause, Play, RotateCcw } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Waveform } from "@/components/Waveform";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { toast } from "sonner";

export default function RecordingPage() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const { isListening, transcript, interimTranscript, start, stop, isSupported } =
    useSpeechRecognition();

  // Start recording on mount
  useEffect(() => {
    if (!isSupported) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => start())
      .catch(() => toast.error("Microphone permission denied"));
  }, []);

  // Timer
  useEffect(() => {
    if (!isListening || paused) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isListening, paused]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handlePauseResume = () => {
    if (paused) {
      start();
      setPaused(false);
    } else {
      stop();
      setPaused(true);
    }
  };

  const handleStartOver = () => {
    stop();
    setSeconds(0);
    setPaused(false);
    start();
  };

  const handleStop = () => {
    stop();
    const finalText = (transcript + " " + interimTranscript).trim();
    if (finalText) {
      navigate("/chat/new", { state: { initialText: finalText } });
    } else {
      toast.error("No speech detected. Try again.");
      navigate(-1);
    }
  };

  const displayText = (transcript + " " + interimTranscript).trim();

  return (
    <div className="flex flex-col min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
        <div className="text-center space-y-2">
          <span className="label-uppercase">VOICE INPUT</span>
          <h1 className="font-display text-2xl text-on-surface italic">
            {paused ? "Paused" : isListening ? "Listening..." : "Starting..."}
          </h1>
        </div>

        <Waveform bars={20} active={isListening && !paused} />

        <motion.div
          animate={isListening && !paused ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-44 h-44 rounded-full orb-gradient orb-shadow flex flex-col items-center justify-center gap-1.5 relative"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-transparent" />
          {paused ? (
            <Pause size={32} className="text-primary-foreground relative z-10" />
          ) : isListening ? (
            <Mic size={32} className="text-primary-foreground relative z-10" />
          ) : (
            <MicOff size={32} className="text-primary-foreground relative z-10" />
          )}
          <span className="text-primary-foreground text-xl font-body font-semibold tracking-wide relative z-10 tabular-nums">
            {formatTime(seconds)}
          </span>
        </motion.div>

        {/* Live transcript preview */}
        {displayText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xs max-h-32 overflow-y-auto rounded-xl surface-high px-4 py-3"
          >
            <p className="text-on-surface text-sm leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="text-on-surface-variant"> {interimTranscript}</span>
              )}
            </p>
          </motion.div>
        )}

        {!displayText && (
          <p className="font-display text-base text-mint italic text-center leading-relaxed max-w-xs">
            "Keep speaking. I'm capturing every word..."
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-4 w-full max-w-xs">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStartOver}
            className="w-12 h-12 rounded-full surface-high border border-border/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            title="Start over"
          >
            <RotateCcw size={18} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePauseResume}
            className="w-12 h-12 rounded-full surface-high border border-border/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            title={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStop}
            className="flex-1 rounded-2xl orb-gradient py-4 text-center text-primary-foreground font-body font-semibold tracking-wider text-sm uppercase"
          >
            Stop & Process
          </motion.button>
        </div>
      </div>
    </div>
  );
}
