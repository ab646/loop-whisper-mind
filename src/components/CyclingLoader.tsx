import { useState, useEffect } from "react";
import { ScribblingLogo, ThinkingLogo } from "@/components/LoopLogo";

const REFLECTION_PHRASES = [
  "Sitting with this",
  "Listening closely",
  "Noticing what's here",
  "Separating signal from noise",
  "Finding the loop",
  "Holding the thought",
  "Reading the shape",
  "Tuning in",
  "Sorting what's known",
  "Letting it land",
  "Weighing what's real",
  "Looking underneath",
  "Catching the thread",
  "Feeling for the edges",
  "Reflecting back",
  "Meeting you here",
  "Parsing the spiral",
  "Checking for assumptions",
  "Finding the question",
  "Making space",
];

const ANALYSIS_PHRASES = [
  "Tracing patterns",
  "Reading between the lines",
  "Mapping your loops",
  "Connecting threads",
  "Weighing fact and assumption",
  "Scanning for shifts",
  "Listening for echoes",
  "Untangling themes",
  "Measuring the current",
  "Finding the shape",
  "Detecting rhythms",
  "Surfacing what repeats",
  "Counting the loops",
  "Noticing what's changed",
  "Looking for the quiet signals",
  "Tracking the undercurrent",
  "Sifting through noise",
  "Charting the drift",
  "Recognizing the familiar",
  "Drawing the map",
];

type LoaderMode = "reflection" | "analysis";

interface CyclingLoaderProps {
  mode: LoaderMode;
  /** Size of the spinner icon in pixels */
  size?: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** Show as inline (horizontal) or block (centered vertical) */
  layout?: "inline" | "block";
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function CyclingLoader({
  mode,
  size = 18,
  className = "",
  layout = "block",
}: CyclingLoaderProps) {
  const phrases = mode === "reflection" ? REFLECTION_PHRASES : ANALYSIS_PHRASES;
  const [shuffled] = useState(() => shuffle(phrases));
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % shuffled.length);
        setFading(false);
      }, 300);
    }, 2800);

    return () => clearInterval(interval);
  }, [shuffled.length]);

  if (layout === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="animate-spin text-on-surface-variant" style={{ width: size, height: size }} />
        <span
          className={`text-on-surface-variant text-sm italic font-display transition-opacity duration-300 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {shuffled[index]}...
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className="animate-spin text-on-surface-variant" style={{ width: size, height: size }} />
      <span
        className={`text-on-surface-variant text-sm italic font-display transition-opacity duration-300 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {shuffled[index]}...
      </span>
    </div>
  );
}
