import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, Pause, Play, RotateCcw } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ProcessingStep = "transcribing" | "deleting";

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: "transcribing", label: "Transcribing" },
  { key: "deleting", label: "Deleting recording" },
];


export default function RecordingPage() {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("transcribing");
  const { isRecording, isPaused, duration, start, stop, pause, resume, reset } =
    useAudioRecorder();
  const startedRef = useRef(false);

  // Fake progress percentage
  const [fakePercent, setFakePercent] = useState(0);

  // Start recording on mount — on native iOS the first getUserMedia call
  // triggers the system permission dialog which can cause the promise to
  // reject before the user has a chance to tap "Allow". We retry once after
  // a short delay to handle this race condition.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const attemptStart = async (retries = 2) => {
      for (let i = 0; i < retries; i++) {
        try {
          await start();
          return; // success
        } catch (err) {
          console.warn(`Mic start attempt ${i + 1} failed:`, err);
          if (i < retries - 1) {
            // Wait a moment for the native permission dialog to resolve
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
      toast.error("Microphone access denied. Please enable it in Settings.");
      navigate(-1);
    };

    attemptStart();
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
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Use authenticated user token instead of anon key
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/transcribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Transcription failed");
      }

      const { text } = await response.json();

      setCurrentStep("deleting");
      await new Promise((r) => setTimeout(r, 800));

      if (text && text.trim()) {
        navigate("/chat/new", { state: { prefillText: text.trim() } });
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