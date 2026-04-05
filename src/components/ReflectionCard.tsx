import { motion } from "framer-motion";

interface ReflectionCardProps {
  mainLoop: string;
  feelings?: string[];
  knownVsAssumed: { known: string[]; assumed: string[] };
  repeatingPattern?: string | null;
  oneQuestion: string;
  nextStep?: string;
  tags?: string[];
}

export function ReflectionCard({ mainLoop, feelings, knownVsAssumed, repeatingPattern, oneQuestion, nextStep, tags }: ReflectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl surface-low p-6 space-y-5 border-l-4 border-mint/30"
    >
      <h3 className="font-display text-xl text-mint italic">Here's what I'm noticing</h3>

      <div className="space-y-2">
        <span className="label-uppercase">Main Loop</span>
        <p className="text-on-surface text-base leading-relaxed font-body">{mainLoop}</p>
      </div>

      {feelings && feelings.length > 0 && (
        <div className="space-y-2">
          <span className="label-uppercase">What you may be feeling</span>
          <p className="text-on-surface text-base font-body">{feelings.join(", ")}</p>
        </div>
      )}

      <div className="space-y-3">
        <span className="label-uppercase">What is known vs assumed</span>
        <ul className="space-y-2">
          {knownVsAssumed.known.map((item, i) => (
            <li key={`k-${i}`} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-mint mt-2 shrink-0" />
              <span className="text-on-surface text-base">{item}</span>
            </li>
          ))}
          {knownVsAssumed.assumed.map((item, i) => (
            <li key={`a-${i}`} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant mt-2 shrink-0" />
              <span className="text-on-surface-variant text-base">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {repeatingPattern && (
        <div className="space-y-2">
          <span className="label-uppercase">What may be repeating</span>
          <p className="text-on-surface text-base leading-relaxed font-body">{repeatingPattern}</p>
        </div>
      )}

      <div className="border-t border-border/30 pt-4 space-y-2">
        <span className="label-uppercase text-mint">One Question</span>
        <p className="font-display text-lg text-mint italic leading-relaxed">
          {oneQuestion}
        </p>
      </div>

      {nextStep && (
        <div className="space-y-2">
          <span className="label-uppercase">One Next Step</span>
          <p className="text-on-surface text-sm leading-relaxed font-body">{nextStep}</p>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {tags.map((tag) => (
            <span key={tag} className="px-3 py-1.5 rounded-full surface-high text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
