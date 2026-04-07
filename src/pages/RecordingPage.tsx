import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, Pause, Play, RotateCcw } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { savePendingChatPrefill } from "@/lib/pending-chat-prefill";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

type ProcessingStep = "transcribing" | "deleting";

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: "transcribing", label: "Transcribing" },
  { key: "deleting", label: "Deleting recording" },
];


export default function RecordingPage() {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("transcribing");
  const { isRecording, isPaused, duration, start, stop, pause, resume, reset } =
    useAudioRecorder();
  const startedRef = useRef(false);

  // Fake progress percentage
  const [fakePercent, setFakePercent] = useState(0);

  // Start recording on mount — native iOS uses the Capacitor recorder,
  // while web uses getUserMedia/MediaRecorder.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    start().catch((err) => {
      console.warn("Mic permission denied:", err);
      setMicDenied(true);
    });
  }, []);

  // Fake progress that eases toward ~90% then jumps to 100% on "deleting"
  useEffect(() => {
    if (!processing) return;
    const target = currentStep === "deleting" ? 100 : 90;
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

  // Microphone denied screen
  if (micDenied) {
    return (
      <div className="flex flex-col h-screen mesh-gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.07] blur-[120px]" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 relative z-10">
          <div className="w-20 h-20 rounded-full surface-high border border-border/30 flex items-center justify-center">
            <MicOff size={32} className="text-on-surface-variant" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="font-display text-xl text-on-surface">
              Microphone Access Required
            </h1>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs">
              Loop needs microphone access to record voice notes. Tap below to open Settings and enable it.
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
    reset();
    start().catch(() => toast.error("Microphone permission denied"));
  };

  const handleStop = async () => {
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
      // Use supabase.functions.invoke so the Supabase JS client handles auth
      // and CORS — raw fetch from capacitor://localhost gets CORS-blocked.
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

      setCurrentStep("deleting");
      await new Promise((r) => setTimeout(r, 800));

      if (text && text.trim()) {
        const trimmedText = text.trim();
        savePendingChatPrefill({ prefillText: trimmedText, autoSubmit: true });
        navigate("/chat/new?autoSubmit=1", { state: { prefillText: trimmedText, autoSubmit: true } });
      } else {
        toast.error("No speech detected. Try again.");
        navigate(-1);
      }
    } catch (e) {
      console.error("Transcription error:", e);
      toast.error(e instanceof Error ? e.message : "Transcription failed");
      setProcessing(false);
    }
  };

  // Processing screen
  if (processing) {
    const activeStep = STEPS.find((s) => s.key === currentStep);
    return (
      <FullScreenLoader
        mode="transcription"
        label={activeStep?.label}
        progress={fakePercent}
      />
    );
  }

  // Recording screen
  return (
    <div className="flex flex-col h-screen mesh-gradient-bg relative overflow-hidden">
      {/* Background haze */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-mint/[0.05] blur-[80px]" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 relative z-10">
        <div className="text-center space-y-2">
          <span className="label-uppercase">VOICE INPUT</span>
          <h1 className="font-display text-2xl text-on-surface italic">
            {isPaused ? "Paused" : isRecording ? "Listening..." : "Starting..."}
          </h1>
        </div>

        <Waveform bars={20} active={isRecording && !isPaused} />

        <motion.div
          animate={isRecording && !isPaused ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-44 h-44 rounded-full orb-gradient orb-shadow flex flex-col items-center justify-center gap-1.5 relative"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-transparent" />
          {isPaused ? (
            <Pause size={32} className="text-primary-foreground relative z-10" />
          ) : isRecording ? (
            <Mic size={32} className="text-primary-foreground relative z-10" />
          ) : (
            <MicOff size={32} className="text-primary-foreground relative z-10" />
          )}
          <span className="text-primary-foreground text-xl font-body font-semibold tracking-wide relative z-10 tabular-nums">
            {formatTime(duration)}
          </span>
        </motion.div>

        <p className="font-display text-base text-mint italic text-center leading-relaxed max-w-xs">
          "Keep speaking. I'm capturing every word..."
        </p>

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
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStop}
            className="flex-1 rounded-2xl orb-gradient py-4 text-center text-primary-foreground font-body font-semibold tracking-wider text-sm uppercase"
          >
            Stop & Process
          </motion.button>
        </div>

        <button
          onClick={() => { reset(); navigate(-1); }}
          className="text-destructive text-sm font-body tracking-wider uppercase hover:text-destructive/80 transition-colors mt-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}