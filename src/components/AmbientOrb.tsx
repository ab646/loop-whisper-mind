import { motion, useTransform, type MotionValue } from "framer-motion";

interface AmbientOrbProps {
  /** scrollY progress from 0 → 1 over the first viewport height */
  scrollProgress: MotionValue<number>;
  onClick: () => void;
}

export function AmbientOrb({ scrollProgress, onClick }: AmbientOrbProps) {
  const opacity = useTransform(scrollProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollProgress, [0, 0.6], [1, 0.85]);
  const y = useTransform(scrollProgress, [0, 0.6], [0, -60]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 top-0 z-0"
      style={{ height: "65svh", opacity }}
    >
      {/* Outer warm glow */}
      <motion.div
        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2"
        style={{ scale, y }}
      >
        {/* Largest ambient ring */}
        <div
          className="rounded-full"
          style={{
            width: "min(90vw, 440px)",
            height: "min(90vw, 440px)",
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.10) 0%, hsl(var(--primary) / 0.04) 40%, transparent 70%)",
          }}
        />
      </motion.div>

      {/* Core glow */}
      <motion.div
        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2"
        style={{ scale, y }}
      >
        <div
          className="rounded-full"
          style={{
            width: "min(55vw, 260px)",
            height: "min(55vw, 260px)",
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.08) 45%, transparent 75%)",
          }}
        />
      </motion.div>

      {/* Bright inner nucleus */}
      <motion.div
        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2"
        style={{ scale, y }}
      >
        <div
          className="rounded-full"
          style={{
            width: "min(28vw, 130px)",
            height: "min(28vw, 130px)",
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.30) 0%, hsl(var(--primary) / 0.12) 50%, transparent 80%)",
            filter: "blur(8px)",
          }}
        />
      </motion.div>

      {/* Interactive tap target — small visible orb anchor */}
      <motion.button
        onClick={onClick}
        className="pointer-events-auto absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ y }}
        whileTap={{ scale: 0.92 }}
      >
        <div
          className="rounded-full orb-gradient orb-shadow flex items-center justify-center"
          style={{ width: 72, height: 72 }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-transparent" />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-foreground relative z-10"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
      </motion.button>
    </motion.div>
  );
}
