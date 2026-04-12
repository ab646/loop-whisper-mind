import { SortMode } from "@/services/notionFeedbackService";

interface Props {
  sortMode: SortMode;
  onChange: (mode: SortMode) => void;
}

export default function FeedbackSortToggle({ sortMode, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {(["top", "new"] as SortMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            sortMode === mode
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {mode === "top" ? "Top" : "New"}
        </button>
      ))}
    </div>
  );
}
