/**
 * Maps Notion select colors to Tailwind classes.
 * When a status is added or changed in Notion, it renders automatically
 * with the matching color — no frontend changes needed.
 */
const NOTION_COLOR_STYLES: Record<string, string> = {
  default: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  brown: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

interface Props {
  label: string | null;
  color: string | null;
}

export default function FeedbackStatusBadge({ label, color }: Props) {
  if (!label) return null;

  const classes = NOTION_COLOR_STYLES[color || "default"] || NOTION_COLOR_STYLES.default;

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${classes}`}>
      {label}
    </span>
  );
}
