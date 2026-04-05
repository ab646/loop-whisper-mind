import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../MainVideo";

export const Scene2Reflect = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Step label
  const labelOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const labelY = interpolate(frame, [0, 20], [40, 0], { extrapolateRight: "clamp" });

  // Card animation
  const cardScale = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 120 } });
  const cardOp = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: "clamp" });

  // Card content stagger
  const line1Op = interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" });
  const line1Y = interpolate(frame, [30, 45], [15, 0], { extrapolateRight: "clamp" });
  const line2Op = interpolate(frame, [42, 57], [0, 1], { extrapolateRight: "clamp" });
  const line2Y = interpolate(frame, [42, 57], [15, 0], { extrapolateRight: "clamp" });
  const line3Op = interpolate(frame, [54, 69], [0, 1], { extrapolateRight: "clamp" });
  const line3Y = interpolate(frame, [54, 69], [15, 0], { extrapolateRight: "clamp" });
  const questionOp = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });
  const questionY = interpolate(frame, [70, 90], [20, 0], { extrapolateRight: "clamp" });

  // Title
  const titleOp = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [5, 25], [30, 0], { extrapolateRight: "clamp" });

  // Tags
  const tagsOp = interpolate(frame, [85, 100], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Step label */}
      <div
        style={{
          position: "absolute",
          top: 420,
          opacity: labelOp,
          transform: `translateY(${labelY}px)`,
          fontSize: 28,
          fontFamily: fonts.body,
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: colors.textDim,
          textTransform: "uppercase",
        }}
      >
        Step 2
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 480,
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          fontSize: 56,
          fontFamily: fonts.display,
          fontStyle: "italic",
          color: colors.text,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        Get instant clarity.
      </div>

      {/* Reflection card */}
      <div
        style={{
          width: 860,
          borderRadius: 32,
          background: colors.surface,
          borderLeft: `6px solid rgba(166,206,206,0.3)`,
          padding: "56px 48px",
          transform: `scale(${cardScale})`,
          opacity: cardOp,
          marginTop: 80,
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 36,
            fontFamily: fonts.display,
            fontStyle: "italic",
            color: colors.mint,
            marginBottom: 40,
            opacity: line1Op,
          }}
        >
          Here's what I'm noticing
        </div>

        {/* Main loop */}
        <div style={{ opacity: line1Op, transform: `translateY(${line1Y}px)`, marginBottom: 32 }}>
          <div
            style={{
              fontSize: 20,
              fontFamily: fonts.body,
              fontWeight: 600,
              letterSpacing: "0.15em",
              color: colors.textDim,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Main Loop
          </div>
          <div
            style={{
              fontSize: 28,
              fontFamily: fonts.body,
              color: colors.text,
              lineHeight: 1.5,
            }}
          >
            You seem stuck between wanting clarity and fearing what clarity might reveal.
          </div>
        </div>

        {/* Known vs assumed */}
        <div style={{ opacity: line2Op, transform: `translateY(${line2Y}px)`, marginBottom: 32 }}>
          <div
            style={{
              fontSize: 20,
              fontFamily: fonts.body,
              fontWeight: 600,
              letterSpacing: "0.15em",
              color: colors.textDim,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Known vs Assumed
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors.mint, marginTop: 8, flexShrink: 0 }} />
            <div style={{ fontSize: 26, color: colors.text, lineHeight: 1.4 }}>They haven't replied.</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors.textDim, marginTop: 8, flexShrink: 0 }} />
            <div style={{ fontSize: 26, color: colors.textDim, lineHeight: 1.4 }}>You may be assuming silence means rejection.</div>
          </div>
        </div>

        {/* Question */}
        <div
          style={{
            opacity: questionOp,
            transform: `translateY(${questionY}px)`,
            borderTop: `1px solid rgba(166,206,206,0.15)`,
            paddingTop: 28,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontFamily: fonts.body,
              fontWeight: 600,
              letterSpacing: "0.15em",
              color: colors.mint,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            One Question
          </div>
          <div
            style={{
              fontSize: 30,
              fontFamily: fonts.display,
              fontStyle: "italic",
              color: colors.mint,
              lineHeight: 1.4,
            }}
          >
            What are you hoping this situation will finally give you?
          </div>
        </div>

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 28,
            opacity: tagsOp,
          }}
        >
          {["SAFETY", "VALIDATION", "PEACE"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                background: colors.bgLight,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: colors.textDim,
                textTransform: "uppercase",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
