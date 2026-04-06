import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, Pause, Play, RotateCcw, Check } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { ScribblingLogo } from "@/components/LoopLogo";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { toast } from "sonner";

type ProcessingStep = "transcribing" | "deleting";

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: "transcribing", label: "Transcribing" },
  { key: "deleting", label: "Deleting recording" },
];

function StepIndicator({
  status,
}: {
  status: "done" | "active" | "pending";
}) {
  if (status === "done") {
    return (
      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
        <Check size={12} className="text-primary-foreground" />
      </div>
    );
  }
  if (status === "active") {
    return (
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="w-5 h-5 rounded-full bg-primary"
      />
    );
  }
  return <div className="w-5 h-5 rounded-full border-2 border-border/40" />;
}

export default function RecordingPage() {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("saved");
  const { isRecording, isPaused, duration, start, stop, pause, resume, reset } =
    useAudioRecorder();
  const startedRef = useRef(false);

  // Start recording on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start().catch(() => toast.error("Microphone permission denied"));
  }, []);

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

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      setCurrentStep("transcribing");

      const response = await fetch(
        `${supabaseUrl}/functions/v1/transcribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
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
      // Brief pause for the "deleting" reassurance step
      await new Promise((r) => setTimeout(r, 800));

      if (text && text.trim()) {
        navigate("/chat/new", { state: { initialText: text.trim() } });
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

  const getStepStatus = (stepKey: ProcessingStep): "done" | "active" | "pending" => {
    const stepOrder = STEPS.map((s) => s.key);
    const currentIdx = stepOrder.indexOf(currentStep);
    const stepIdx = stepOrder.indexOf(stepKey);
    if (stepIdx < currentIdx) return "done";
    if (stepIdx === currentIdx) return "active";
    return "pending";
  };

  // Processing screen
  if (processing) {
    return (
      <div className="flex flex-col min-h-screen mesh-gradient-bg items-center justify-center gap-8 px-8">
        <ScribblingLogo size={108} />

        <div className="space-y-3 w-full max-w-xs">
          {STEPS.map((step) => {
            const status = getStepStatus(step.key);
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3"
              >
                <StepIndicator status={status} />
                <span
                  className={`font-body text-sm ${
                    status === "done"
                      ? "text-on-surface"
                      : status === "active"
                      ? "text-on-surface font-semibold"
                      : "text-on-surface-variant/50"
                  }`}
                >
                  {step.label}
                  {status === "active" && "..."}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // Recording screen
  return (
    <div className="flex flex-col min-h-screen mesh-gradient-bg">
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
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
      </div>
    </div>
  );
}
