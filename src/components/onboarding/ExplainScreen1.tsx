import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { ScribblingLogo } from "@/components/LoopLogo";

const TRANSCRIBED_TEXT =
  "I keep replaying what my manager said in the meeting. She probably thinks I'm not ready for the project lead role...";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

type Phase = "idle" | "recording" | "transcribing" | "done";

export function ExplainScreen1() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    // idle -> recording at 1s
    const t1 = setTimeout(() => setPhase("recording"), 1000);
    // recording -> transcribing at 3.5s
    const t2 = setTimeout(() => setPhase("transcribing"), 3500);
    // transcribing -> done at 5s, start typewriter
    const t3 = setTimeout(() => setPhase("done"), 5000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Typewriter when done
  useEffect(() => {
    if (phase !== "done") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < TRANSCRIBED_TEXT.length) {
        setDisplayText(TRANSCRIBED_TEXT.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <motion.h1 {...fade(0)} className="font-display text-2xl text-on-surface leading-tight">
          You talk.
        </motion.h1>
        <motion.p {...fade(0.5)} className="text-on-surface-variant text-sm">
          Voice or text — whatever's looping in your head.
        </motion.p>
      </div>

      <div className="flex flex-col items-center gap-5 py-4 min-h-[220px]">
        {/* Orb / Mic */}
        <AnimatePresence mode="wait">
          {(phase === "idle" || phase === "recording") && (
            <motion.div
              key="orb"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Pulsing orb */}
              <div className="relative flex items-center justify-center">
                {phase === "recording" && (
                  <motion.div
                    className="absolute w-24 h-24 rounded-full bg-mint/10"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <motion.div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    phase === "recording" ? "orb-gradient" : "surface-high"
                  }`}
                  animate={phase === "recording" ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Mic size={22} className={phase === "recording" ? "text-primary-foreground" : "text-on-surface-variant"} />
                </motion.div>
              </div>

              {/* Waveform bars — only during recording */}
              {phase === "recording" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-[3px] h-8"
                >
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-[3px] rounded-full bg-mint/60"
                      animate={{
                        height: [8, 14 + Math.sin(i * 1.3) * 14, 6, 18 + Math.cos(i * 0.9) * 10, 8],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.06,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </motion.div>
              )}

              <p className="text-on-surface-variant text-xs font-body">
                {phase === "idle" ? "Tap to record" : "Listening..."}
              </p>
            </motion.div>
          )}

          {phase === "transcribing" && (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <ScribblingLogo size={40} />
              <p className="text-on-surface-variant text-xs font-body uppercase tracking-widest">
                Transcribing
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcribed text bubble */}
        <AnimatePresence>
          {phase === "done" && displayText && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full flex justify-end"
            >
              <div className="rounded-2xl surface-high px-4 py-3 max-w-[85%]">
                <p className="text-on-surface text-[15px] leading-relaxed">
                  {displayText}
                  <span className="inline-block w-[2px] h-4 bg-mint ml-0.5 animate-pulse align-text-bottom" />
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
