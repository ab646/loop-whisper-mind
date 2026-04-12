import { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { ScribblingLogo, ThinkingLogo } from "@/components/LoopLogo";

const REFLECTION_PHRASES = [
  "Sitting with this",
  "Listening closely",
  "Noticing what's here",
  "Separating signal from noise",
  "Finding the loop",
  "Holding the thought",
  "Tuning in",
  "Sorting what's known",
  "Letting it land",
  "Weighing what's real",
  "Looking underneath",
  "Catching the thread",
  "Reflecting back",
  "Meeting you here",
  "Making space",
];

const ANALYSIS_PHRASES = [
  "Tracing patterns",
  "Reading between the lines",
  "Mapping your loops",
  "Connecting threads",
  "Scanning for shifts",
  "Listening for echoes",
  "Untangling themes",
  "Finding the shape",
  "Detecting rhythms",
  "Surfacing what repeats",
  "Noticing what's changed",
  "Tracking the undercurrent",
  "Charting the drift",
  "Drawing the map",
];

const TRANSCRIPTION_PHRASES = [
  "Transcribing your words",
  "Capturing every syllable",
  "Converting speech to text",
  "Processing your voice",
  "Decoding your message",
  "Listening back carefully",
  "Parsing your thoughts",
];

type LoaderMode = "reflection" | "analysis" | "transcription";

interface FullScreenLoaderProps {
  mode: LoaderMode;
  /** Optional override label (e.g. "Deleting recording") */
  label?: string;
  /** Optional progress percentage (0-100) */
  progress?: number;
  /** Called when user taps cancel after timeout */
  onCancel?: () => void;
  /** Seconds before showing "taking longer" message (default 30) */
  timeoutSeconds?: number;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PHRASE_MAP: Record<LoaderMode, string[]> = {
  reflection: REFLECTION_PHRASES,
  analysis: ANALYSIS_PHRASES,
  transcription: TRANSCRIPTION_PHRASES,
};

export function FullScreenLoader({ mode, label, progress, onCancel, timeoutSeconds = 30 }: FullScreenLoaderProps) {
  const prefersReduced = useReducedMotion();
  const phrases = PHRASE_MAP[mode];
  const [shuffled] = useState(() => shuffle(phrases));
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (prefersReduced || label) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % shuffled.length);
        setFading(false);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, [shuffled.length, prefersReduced, label]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutSeconds * 1000);
    return () => clearTimeout(timer);
  }, [timeoutSeconds]);

  const LogoComponent = mode === "analysis" ? ThinkingLogo : ScribblingLogo;
  const displayText = label || `${shuffled[index]}...`;

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg items-center justify-center gap-4 px-8" style={{ paddingBottom: 'var(--bottom-nav-height, 0px)' }}>
      <LogoComponent size={80} />

      <div className="flex items-center gap-2 mt-1">
        <span
          className={`text-on-surface-variant text-sm italic font-display transition-opacity duration-300 ${
            label ? "opacity-100" : fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {displayText}
        </span>
        {progress !== undefined && (
          <span className="text-on-surface-variant/50 text-sm font-body tabular-nums">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {timedOut && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <p className="text-on-surface-variant text-xs text-center">Taking longer than usual...</p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-mint text-sm font-semibold py-2 px-4"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
