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
  nextStep?: string;
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

export function ReflectionCard({ mainLoop, feelings, knownVsAssumed, repeatingPattern, oneQuestion, nextStep, tags, themeAnswer }: ReflectionCardProps) {
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

      {/* Collapsible: Fact vs Story — Loop's differentiator */}
      <CollapsibleSection title="Fact vs Story" defaultOpen>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="label-uppercase text-mint text-[10px]">Fact</span>
            <ul className="space-y-2">
              {knownVsAssumed.known.map((item, i) => (
                <li key={`k-${i}`} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint mt-2 shrink-0" />
                  <span className="text-on-surface text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <span className="label-uppercase text-on-surface-variant text-[10px]">Story</span>
            <div className="border-l-2 border-on-surface-variant/30 pl-3 space-y-2">
              {knownVsAssumed.assumed.map((item, i) => (
                <p key={`a-${i}`} className="text-on-surface-variant text-base italic">{item}</p>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Collapsible: Pattern */}
      {(repeatingPattern || nextStep) && (
        <CollapsibleSection title="Pattern">
          {repeatingPattern && (
            <p className="text-on-surface text-base leading-relaxed font-body">{repeatingPattern}</p>
          )}
          {nextStep && (
            <p className="text-on-surface-variant text-sm leading-relaxed font-body mt-2">
              Next step: {nextStep}
            </p>
          )}
        </CollapsibleSection>
      )}

      {/* Tags + Feedback */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-wrap gap-2">
          {tags && tags.length > 0 && tags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag.replace(/_/g, " ").trim().toLowerCase().replace(/^\w/, (char) => char.toUpperCase())}
            </span>
          ))}
        </div>
        <FeedbackButtons
          contentType="reflection"
          contentId={feedbackId}
          contentPreview={oneQuestion}
        />
      </div>
    </motion.div>
  );
}
