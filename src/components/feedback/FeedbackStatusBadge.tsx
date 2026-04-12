const STATUS_STYLES: Record<string, string> = {
  planned: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  shipped: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface Props {
  status: string;
  label: string;
}

export default function FeedbackStatusBadge({ status, label }: Props) {
  const classes = STATUS_STYLES[status];
  if (!classes) return null;

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${classes}`}>
      {label}
    </span>
  );
}
