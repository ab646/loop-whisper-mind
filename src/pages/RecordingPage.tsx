import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MicOff, Pause, Play, RotateCcw, Square } from "lucide-react";

import { FullScreenLoader } from "@/components/FullScreenLoader";
import {
  useAudioRecorder,
  MAX_RECORDING_SECONDS,
  RECORDING_WARN_SECONDS,
  RECORDING_AMBER_SECONDS,
} from "@/hooks/useAudioRecorder";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { useCreateLoop } from "@/hooks/useCreateLoop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
const isNativePlatform = Capacitor.isNativePlatform();
import { NativeSettings, IOSSettings } from "capacitor-native-settings";
import { analytics } from "@/lib/analytics";
import { recalculateAfterEntry } from "@/lib/adaptive-notifications";
import {
  ENTRY_THRESHOLDS,
  countWords,
  isLikelyWhisperHallucination,
} from "@/lib/entryThresholds";

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
  const autoStopRef = useRef<(() => void) | null>(null);
  const { isRecording, isPaused, duration, stream, start, stop, pause, resume, reset } =
    useAudioRecorder({
      onMaxDurationReached: () => autoStopRef.current?.(),
    });
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
      console.error("Recording start failed:", err);
      // Only show mic denied screen if it's actually a permission error
      const msg = err?.message?.toLowerCase() ?? "";
      if (msg.includes("permission") || msg.includes("denied") || msg.includes("not allowed")) {
        setMicDenied(true);
      } else {
        // Non-permission error — retry once
        toast.error("Couldn't start recording. Trying again...");
        setTimeout(() => {
          start().catch((retryErr) => {
            console.error("Retry failed:", retryErr);
            setMicDenied(true);
          });
        }, 500);
      }
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
      <div className="flex flex-col h-[100dvh] mesh-gradient-bg relative overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
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
                  try {
                    await NativeSettings.openIOS({ option: IOSSettings.App });
                  } catch {
                    toast.error("Couldn't open settings");
                  }
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

  // Wire auto-stop ref so the recorder hook can trigger handleStop
  useEffect(() => {
    autoStopRef.current = () => {
      toast("That was a long one. Your entry's saved.");
      handleStop();
    };
  });

  // 1-minute warning toast
  const warnShownRef = useRef(false);
  useEffect(() => {
    const remaining = MAX_RECORDING_SECONDS - duration;
    if (
      isRecording &&
      !isPaused &&
      remaining <= RECORDING_WARN_SECONDS &&
      remaining > 0 &&
      !warnShownRef.current
    ) {
      warnShownRef.current = true;
      toast("One minute left — wrap up whenever you're ready.");
    }
  }, [duration, isRecording, isPaused]);

  const handleStop = async () => {
    // ── Scenario 1: duration floor ─────────────────────────────────
    // Reject anything shorter than MIN_RECORDING_SECONDS before we even
    // stop the mic. Saves a Whisper call and prevents hallucination on
    // silent / <2s audio. Do NOT disconnect the analyser here — the
    // user stays in recording mode so they can keep talking.
    if (duration < ENTRY_THRESHOLDS.MIN_RECORDING_SECONDS) {
      analytics.recordingTooShort(duration, ENTRY_THRESHOLDS.MIN_RECORDING_SECONDS);
      toast("Take your time — tell me what's on your mind.", {
        description: `Recordings need to be at least ${ENTRY_THRESHOLDS.MIN_RECORDING_SECONDS} seconds.`,
      });
      return;
    }

    disconnect();
    const blob = await stop();

    // ── Scenario 2: empty / corrupted blob ─────────────────────────
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
      const trimmed = text?.trim() ?? "";

      // ── Scenario 3: empty transcription ──────────────────────────
      if (!trimmed) {
        toast.error("No speech detected. Try speaking a little louder or closer to the mic.");
        setProcessing(false);
        navigate(-1);
        return;
      }

      // ── Scenario 4: Whisper hallucination on silent audio ────────
      // If Whisper returned a known artifact phrase ("Thank you.",
      // "Thanks for watching!", etc.), reject as if no speech detected.
      if (isLikelyWhisperHallucination(trimmed)) {
        analytics.transcriptionHallucinationRejected(trimmed, audioMime);
        toast.error("I couldn't hear you clearly. Try again in a quieter spot?");
        setProcessing(false);
        navigate(-1);
        return;
      }

      const wordCount = countWords(trimmed);
      analytics.transcriptionCompleted(wordCount, audioMime);

      // ── Scenario 5: below word floor for loop analysis ───────────
      // Transcription worked but the entry is too brief for a meaningful
      // loop reflection. We still save it — but flag it as `brief` so
      // the reflect function gives a softer, shorter response.
      if (wordCount < ENTRY_THRESHOLDS.MIN_WORDS_FOR_LOOP_ANALYSIS) {
        analytics.entryBelowWordFloor({
          source: "voice",
          wordCount,
          floor: ENTRY_THRESHOLDS.MIN_WORDS_FOR_LOOP_ANALYSIS,
          action: "sent_as_brief",
        });
        toast("Got it — brief entry saved.", {
          description: "Next time, try a few more sentences for a deeper reflection.",
        });
      }

      // Now call reflect
      setCurrentStep("reflecting");
      const reflectStart = Date.now();
      const result = await createEntry({ content: trimmed, entryType: "voice" });
      const entryId = result?.entryId;

      // Crisis routing is now handled centrally inside useCreateLoop
      if (entryId) {
        analytics.recordingCompleted(duration);
        analytics.reflectionReceived({ responseTimeMs: Date.now() - reflectStart, entryId, entryType: "voice" });
        analytics.entrySaved(entryId);
        recalculateAfterEntry();
        navigate(`/journal/${entryId}`);
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

  // Compute average audio level for ring intensity (web only; native has no stream)
  const avgLevel = isNativePlatform ? 0 : levels.reduce((a, b) => a + b, 0) / (levels.length || 1);
  const useNativeFallback = isNativePlatform && isRecording && !isPaused;

  return (
    <div className="flex flex-col h-[100dvh] mesh-gradient-bg relative overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="flex-1 flex flex-col items-center relative z-10">
        {/* Top text area — positioned to match homepage layout */}
        <div className="flex flex-col items-center mt-auto mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center space-y-1"
          >
            <span className="label-uppercase">{isPaused ? "PAUSED" : "LISTENING"}</span>
            <p className="font-display text-base text-mint italic text-center leading-relaxed max-w-xs">
              {isPaused ? "Tap play to continue" : isRecording ? "Keep speaking. I'm capturing every word..." : "Starting..."}
            </p>
          </motion.div>
        </div>

        {/* Orb with radiating pulse rings — centered like homepage */}
        <div className="relative flex items-center justify-center mb-auto" style={{ width: 360, height: 360 }}>
          {/* Reactive rings — scale directly with voice level */}
          {isRecording && !isPaused && !useNativeFallback && (
            <>
              {/* Inner ring — tightest, most reactive */}
              <motion.div
                className="absolute rounded-full"
                style={{ width: 176, height: 176 }}
                animate={{
                  scale: 1 + avgLevel * 1.8,
                  opacity: 0.15 + avgLevel * 0.45,
                  borderWidth: 2 + avgLevel * 2,
                  borderColor: `hsl(var(--primary) / ${0.3 + avgLevel * 0.5})`,
                }}
                transition={{ duration: 0.08, ease: "linear" }}
                initial={false}
              />
              {/* Middle ring */}
              <motion.div
                className="absolute rounded-full"
                style={{ width: 176, height: 176, borderStyle: "solid" }}
                animate={{
                  scale: 1.15 + avgLevel * 2.4,
                  opacity: 0.1 + avgLevel * 0.3,
                  borderWidth: 1.5 + avgLevel * 1.5,
                  borderColor: `hsl(var(--primary) / ${0.2 + avgLevel * 0.35})`,
                }}
                transition={{ duration: 0.12, ease: "linear" }}
                initial={false}
              />
              {/* Outer ring — widest spread */}
              <motion.div
                className="absolute rounded-full"
                style={{ width: 176, height: 176, borderStyle: "solid" }}
                animate={{
                  scale: 1.3 + avgLevel * 3.0,
                  opacity: 0.06 + avgLevel * 0.2,
                  borderWidth: 1 + avgLevel * 1,
                  borderColor: `hsl(var(--primary) / ${0.12 + avgLevel * 0.25})`,
                }}
                transition={{ duration: 0.15, ease: "linear" }}
                initial={false}
              />
              {/* Ambient glow */}
              <motion.div
                className="absolute rounded-full"
                style={{ width: 200, height: 200 }}
                animate={{
                  scale: 1 + avgLevel * 1.2,
                  opacity: 0.3 + avgLevel * 0.5,
                  background: `radial-gradient(circle, hsl(var(--primary) / ${0.1 + avgLevel * 0.35}) 0%, transparent 70%)`,
                }}
                transition={{ duration: 0.08, ease: "linear" }}
                initial={false}
              />
            </>
          )}

          {/* Native fallback: CSS-animated pulse rings (no audio stream available) */}
          {useNativeFallback && (
            <>
              <motion.div
                className="absolute rounded-full border-2"
                style={{ width: 176, height: 176, borderColor: "hsl(var(--primary) / 0.4)" }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute rounded-full border"
                style={{ width: 176, height: 176, borderColor: "hsl(var(--primary) / 0.3)" }}
                animate={{ scale: [1.1, 2.0, 1.1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
              <motion.div
                className="absolute rounded-full border"
                style={{ width: 176, height: 176, borderColor: "hsl(var(--primary) / 0.2)" }}
                animate={{ scale: [1.2, 2.4, 1.2], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{ width: 200, height: 200 }}
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-full h-full rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)" }} />
              </motion.div>
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
        <div className="flex flex-col items-center gap-4 mb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
          <span
            className={`text-sm font-body font-medium tracking-widest tabular-nums transition-colors ${
              MAX_RECORDING_SECONDS - duration <= RECORDING_AMBER_SECONDS
                ? MAX_RECORDING_SECONDS - duration <= RECORDING_WARN_SECONDS
                  ? "text-destructive"
                  : "text-amber-400"
                : "text-on-surface-variant"
            }`}
          >
            {formatTime(duration)} / {formatTime(MAX_RECORDING_SECONDS)}
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
