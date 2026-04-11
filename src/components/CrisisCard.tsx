import { motion } from "framer-motion";
import { LifeBuoy, ExternalLink } from "lucide-react";

export interface CrisisResources {
  helpline: { label: string; description: string; url: string };
  us: { label: string; description: string; url: string };
  emergency: string;
}

interface CrisisCardProps {
  message: string;
  resources: CrisisResources;
}

/**
 * Surfaced when the input guard classifies a message as crisis.
 * Non-blocking — the user can still continue writing — but the
 * resources are impossible to miss. Loop voice: warm, direct,
 * never reassuring, never diagnostic.
 */
export function CrisisCard({ message, resources }: CrisisCardProps) {
  const open = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-mint/30 bg-mint/5 p-5 space-y-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-full bg-mint/15 p-2">
          <LifeBuoy size={18} className="text-mint" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="label-uppercase text-mint">A note from Loop</p>
          <p className="text-on-surface text-[15px] leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => open(resources.helpline.url)}
          className="w-full text-left rounded-xl border border-border/30 bg-surface/60 px-4 py-3 hover:bg-surface transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-on-surface text-sm font-medium">
                {resources.helpline.label}
              </p>
              <p className="text-on-surface-variant text-xs mt-0.5">
                {resources.helpline.description}
              </p>
            </div>
            <ExternalLink
              size={14}
              className="text-on-surface-variant mt-0.5 group-hover:text-mint transition-colors"
            />
          </div>
        </button>

        <button
          onClick={() => open(resources.us.url)}
          className="w-full text-left rounded-xl border border-border/30 bg-surface/60 px-4 py-3 hover:bg-surface transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-on-surface text-sm font-medium">
                {resources.us.label}
              </p>
              <p className="text-on-surface-variant text-xs mt-0.5">
                {resources.us.description}
              </p>
            </div>
            <ExternalLink
              size={14}
              className="text-on-surface-variant mt-0.5 group-hover:text-mint transition-colors"
            />
          </div>
        </button>
      </div>

      <p className="text-on-surface-variant text-xs leading-relaxed pt-1">
        {resources.emergency}
      </p>
    </motion.div>
  );
}
