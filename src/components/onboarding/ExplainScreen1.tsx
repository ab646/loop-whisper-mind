import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const FULL_TEXT =
  "I keep replaying what my manager said in the meeting. She probably thinks I'm not ready for the project lead role...";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export function ExplainScreen1() {
  const [displayText, setDisplayText] = useState("");
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    const bubbleTimer = setTimeout(() => setShowBubble(true), 1000);

    let i = 0;
    const typeTimer = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < FULL_TEXT.length) {
          setDisplayText(FULL_TEXT.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 40);
      return () => clearInterval(interval);
    }, 1300);

    return () => {
      clearTimeout(bubbleTimer);
      clearTimeout(typeTimer);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <motion.h1 {...fade(0)} className="font-display text-2xl text-on-surface leading-tight">
          You talk.
        </motion.h1>
        <motion.p {...fade(0.5)} className="text-on-surface-variant text-sm">
          Voice or text — whatever's looping in your head.
        </motion.p>
      </div>

      {showBubble && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-end"
        >
          <div className="rounded-2xl surface-high px-4 py-3 max-w-[85%]">
            <p className="text-on-surface text-[15px] leading-relaxed">
              {displayText}
              <span className="inline-block w-[2px] h-4 bg-mint ml-0.5 animate-pulse align-text-bottom" />
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
