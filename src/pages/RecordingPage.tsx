import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MicOff, Pause, Play, RotateCcw, Square } from "lucide-react";

import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { useCreateLoop } from "@/hooks/useCreateLoop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { analytics } from "@/lib/analytics";
import { recalculateAfterEntry } from "@/lib/adaptive-notifications";

type ProcessingStep = "transcribing" | "reflecting";

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: "transcribing", label: "Transcribing" },
  { key: "reflecting", label: "Reflecting" },
];

const WAVEFORM_BARS = 20;

export default function RecordingPage() {
  const navigate = useNavigate();
  const { createEntry, loading: creatingLoop } = useCreateLoop();
  const [processing, setProcessing] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("transcribing");
  const { isRecording, isPaused, duration, stream, start, stop, pause, resume, reset } =
    useAudioRecorder();
  const { levels, connect, disconnect } = useAudioAnalyser(WAVEFORM_BARS);
  const startedRef = useRef(false);

  const [fakePercent, setFakePercent] = useState(0);

  // Connect analyser when stream becomes available (web only)
  useEffect(() => {
    if (stream && isRecording) {
      connect(stream);
    }
    return () => disconnect();
  }, [stream, isRecording]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    start().then(() => {
      analytics.recordingStarted();
    }).catch((err) => {
      console.warn("Mic permission denied:", err);
      setMicDenied(true);
    });
  }, []);

  useEffect(() => {
    if (!processing) return;
    const target = currentStep === "reflecting" ? 100 : 60;
    const interval = setInterval(() => {
      setFakePercent((prev) => {
        if (prev >= target) return prev;
        const remaining = target - prev;
        const increment = Math.max(0.5, remaining * 0.06);
        return Math.min(target, prev + increment);
      });
    }, 200);
    return () => clearInterval(interval);
  }, [processing, currentStep]);

  if (micDenied) {
    return (
      <div className="flex flex-col h-screen mesh-gradient-bg relative overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 relative z-10">
          <div className="w-20 h-20 rounded-full surface-high border border-border/30 flex items-center justify-center">
            <MicOff size={32} className="text-on-surface-variant" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="font-display text-xl text-on-surface">
              I can't hear you.
            </h1>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs">
              Loop listens. For that, it needs your mic. Tap Settings to let it in.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                if (Capacitor.isNativePlatform()) {
                  window.location.href = "app-settings:";
                  return;
                }

                setMicDenied(false);
                startedRef.current = false;
                try {
                  await start();
                } catch {
                  setMicDenied(true);
                }
              }}
              className="rounded-2xl orb-gradient py-4 text-center text-primary-foreground font-body font-semibold tracking-wider text-sm uppercase"
            >
              Open Settings
            </motion.button>
            <button
              onClick={() => navigate(-1)}
              className="text-on-surface-variant text-sm font-body tracking-wider uppercase hover:text-on-surface transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleStartOver = () => {
    disconnect();
    reset();
    start().catch(() => toast.error("I can't reach your mic. Check Settings."));
  };

  const handleStop = async () => {
    disconnect();
    const blob = await stop();
    if (!blob || blob.size === 0) {
      toast.error("No audio recorded. Try again.");
      navigate(-1);
      return;
    }

    setProcessing(true);
    setCurrentStep("transcribing");
    setFakePercent(0);

    try {
      const isNative = Capacitor.isNativePlatform();
      const audioMime = isNative ? "audio/mp4" : (blob.type || "audio/webm");
      const audioName = isNative ? "recording.m4a" : "recording.webm";
      const audioBlob = new Blob([blob], { type: audioMime });

      const formData = new FormData();
      formData.append("audio", audioBlob, audioName);

      const { data, error: fnError } = await supabase.functions.invoke("transcribe", {
        body: formData,
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const text: string | undefined = data?.text;

      if (!text || !text.trim()) {
        toast.error("No speech detected. Try again.");
        navigate(-1);
        return;
      }

      const wordCount = text.trim().split(/\s+/).length;
      analytics.transcriptionCompleted(wordCount, audioMime);

      // Now call reflect
      setCurrentStep("reflecting");
      const reflectStart = Date.now();
      const entryId = await createEntry({ content: text.trim(), entryType: "voice" });

      if (entryId) {
        analytics.recordingCompleted(duration);
        analytics.reflectionReceived({ responseTimeMs: Date.now() - reflectStart, entryId, entryType: "voice" });
        analytics.entrySaved(entryId);
        recalculateAfterEntry();
        navigate(`/chat/${entryId}`);
      } else {
        navigate(-1);
      }
    } catch (e) {
      console.error("Transcription error:", e);
      toast.error(e instanceof Error ? e.message : "Transcription failed");
      setProcessing(false);
    }
  };

  if (processing) {
    const activeStep = STEPS.find((s) => s.key === currentStep);
    return (
      <FullScreenLoader
        mode={currentStep === "reflecting" ? "reflection" : "transcription"}
        label={activeStep?.label}
        progress={fakePercent}
      />
    );
  }

  // Compute average audio level for ring intensity
  const avgLevel = levels.reduce((a, b) => a + b, 0) / (levels.length || 1);

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center relative z-10">
        {/* Top text area — positioned to match homepage layout */}
        <div className="flex flex-col items-center mt-auto mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center space-y-1"
          >
            <span className="label-uppercase">VOICE INPUT</span>
            <p className="font-display text-base text-mint italic text-center leading-relaxed max-w-xs">
              {isPaused ? "Paused" : isRecording ? "Keep speaking. I'm capturing every word..." : "Starting..."}
            </p>
          </motion.div>
        </div>

        {/* Orb with radiating pulse rings — centered like homepage */}
        <div className="relative flex items-center justify-center mb-auto" style={{ width: 360, height: 360 }}>
          {/* Pulse rings — driven by real audio level */}
          {isRecording && !isPaused && (
            <>
              {/* Ring 1 — fast, tight */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 176,
                  height: 176,
                  border: `2px solid hsl(var(--primary) / ${0.25 + avgLevel * 0.35})`,
                }}
                animate={{
                  scale: [1, 1.4 + avgLevel * 1.2],
                  opacity: [0.5 + avgLevel * 0.3, 0],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
              />
              {/* Ring 2 — medium */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 176,
                  height: 176,
                  border: `2px solid hsl(var(--primary) / ${0.18 + avgLevel * 0.25})`,
                }}
                animate={{
                  scale: [1, 1.7 + avgLevel * 1.4],
                  opacity: [0.4 + avgLevel * 0.2, 0],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
              />
              {/* Ring 3 — wide */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 176,
                  height: 176,
                  border: `1.5px solid hsl(var(--primary) / ${0.12 + avgLevel * 0.2})`,
                }}
                animate={{
                  scale: [1, 2.0 + avgLevel * 1.5],
                  opacity: [0.3 + avgLevel * 0.15, 0],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
              />
              {/* Ambient glow — scales with volume */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 220,
                  height: 220,
                  background: `radial-gradient(circle, hsl(var(--primary) / ${0.15 + avgLevel * 0.3}) 0%, transparent 70%)`,
                }}
                animate={{ scale: 1 + avgLevel * 0.6 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              />
            </>
          )}

          <motion.button
            layoutId="voice-orb"
            onClick={handleStop}
            whileTap={{ scale: 0.92 }}
            animate={isRecording && !isPaused ? { scale: [1, 1.03, 1] } : {}}
            transition={{
              layout: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
              scale: { duration: 2, repeat: Infinity },
            }}
            className="w-44 h-44 rounded-full orb-gradient orb-shadow flex items-center justify-center relative z-10"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-transparent" />
            <Square size={32} className="text-primary-foreground relative z-10" fill="currentColor" strokeWidth={0} style={{ borderRadius: 6 }} />
          </motion.button>
        </div>

        {/* Timer — smaller, below orb */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <span className="text-on-surface-variant text-sm font-body font-medium tracking-widest tabular-nums">
            {formatTime(duration)}
          </span>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="flex items-center gap-4"
          >

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePauseResume}
              className="w-12 h-12 rounded-full surface-high border border-border/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </motion.button>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            onClick={() => { disconnect(); reset(); navigate(-1); }}
            className="text-destructive text-sm font-body tracking-wider uppercase hover:text-destructive/80 transition-colors mt-2"
          >
            Cancel
          </motion.button>
        </div>
      </div>
    </div>
  );
}
