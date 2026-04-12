interface Props {
  onSuggest: () => void;
}

export default function FeedbackEmptyState({ onSuggest }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 space-y-4">
      <span className="text-4xl">💡</span>
      <div>
        <p className="text-on-surface font-medium">No ideas yet — be the first!</p>
        <p className="text-on-surface-variant text-sm mt-1">
          Tell us what you'd love to see in Loop.
        </p>
      </div>
      <button
        onClick={onSuggest}
        className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold"
      >
        Suggest a feature
      </button>
    </div>
  );
}
