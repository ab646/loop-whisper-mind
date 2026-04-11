import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FeedbackButtons } from "@/components/FeedbackButtons";

interface ReflectionCardProps {
  mainLoop: string;
  feelings?: string[];
  knownVsAssumed: { known: string[]; assumed: string[] };
  repeatingPattern?: string | null;
  oneQuestion: string;
  tags?: string[];
  themeAnswer?: string;
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border/20 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1 group"
      >
        <span className="label-uppercase group-hover:text-mint transition-colors">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className="text-on-surface-variant" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ReflectionCard({ mainLoop, feelings, knownVsAssumed, repeatingPattern, oneQuestion, tags, themeAnswer }: ReflectionCardProps) {
  const feedbackId = useMemo(() => {
    const text = (oneQuestion + mainLoop).substring(0, 50);
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return `reflection-${Math.abs(hash)}`;
  }, [oneQuestion, mainLoop]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl glass-panel p-6 space-y-4 border-l-4 border-mint/30 border border-border/20"
    >
      {/* Lead with the One Question — the "aha moment" */}
      <div className="space-y-2">
        <span className="label-uppercase text-mint">One Question</span>
        <p className="font-display text-xl text-mint italic leading-relaxed">
          {oneQuestion}
        </p>
      </div>

      {/* Theme exploration answer */}
      {themeAnswer && (
        <div className="space-y-1.5">
          <span className="label-uppercase text-mint">Reflection</span>
          <p className="text-on-surface text-base leading-relaxed font-body">{themeAnswer}</p>
        </div>
      )}

      {/* Main Loop as context label */}
      {!themeAnswer && (
        <div className="space-y-1.5">
          <span className="label-uppercase">Main Loop</span>
          <p className="text-on-surface text-base leading-relaxed font-body">{mainLoop}</p>
        </div>
      )}

      {/* Collapsible: Feelings */}
      {feelings && feelings.length > 0 && (
        <CollapsibleSection title="What you may be feeling">
          <p className="text-on-surface text-base font-body">{feelings.join(", ")}</p>
        </CollapsibleSection>
      )}

      {/* Fact vs Assumption — inspired by trends visualization */}
      <CollapsibleSection title="Fact vs Assumption" defaultOpen>
        {(() => {
          const factCount = knownVsAssumed.known.length;
          const assumptionCount = knownVsAssumed.assumed.length;
          const total = factCount + assumptionCount || 1;
          const factPct = Math.round((factCount / total) * 100);
          const assumptionPct = 100 - factPct;

          return (
            <div className="grid grid-cols-2 gap-4">
              {/* Facts column */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-sm text-mint font-semibold">Facts</span>
                  <span className="font-display text-2xl text-on-surface font-bold">{factPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full rounded-full bg-mint" style={{ width: `${factPct}%` }} />
                </div>
                {knownVsAssumed.known[0] && (
                  <p className="text-on-surface-variant text-sm italic leading-relaxed font-body">
                    "{knownVsAssumed.known[0]}"
                  </p>
                )}
              </div>

              {/* Assumptions column */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-sm text-tertiary font-semibold">Assumptions</span>
                  <span className="font-display text-2xl text-on-surface font-bold">{assumptionPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full rounded-full bg-tertiary" style={{ width: `${assumptionPct}%` }} />
                </div>
                {knownVsAssumed.assumed[0] && (
                  <p className="text-on-surface-variant text-sm italic leading-relaxed font-body">
                    "{knownVsAssumed.assumed[0]}"
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </CollapsibleSection>

      {/* Collapsible: Pattern */}
      {repeatingPattern && (
        <CollapsibleSection title="Pattern">
          <p className="text-on-surface text-base leading-relaxed font-body">{repeatingPattern}</p>
        </CollapsibleSection>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {tags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag.replace(/_/g, " ").trim().toLowerCase().replace(/^\w/, (char) => char.toUpperCase())}
            </span>
          ))}
        </div>
      )}

      {/* Feedback */}
      <div className="flex justify-end pt-1">
        <FeedbackButtons
          contentType="reflection"
          contentId={feedbackId}
          contentPreview={oneQuestion}
        />
      </div>
    </motion.div>
  );
}
