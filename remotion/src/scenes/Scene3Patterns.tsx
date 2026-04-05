import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { colors, fonts } from "../MainVideo";

export const Scene3Patterns = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Step label
  const labelOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const labelY = interpolate(frame, [0, 20], [40, 0], { extrapolateRight: "clamp" });

  // Title
  const titleOp = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [5, 25], [30, 0], { extrapolateRight: "clamp" });

  // Theme cards stagger
  const themes = [
    { name: "Ambiguity", count: 12, color: "#f9a8d4" },
    { name: "Rejection", count: 8, color: "#86efac" },
    { name: "Work Anxiety", count: 15, color: "#fbbf24" },
    { name: "Self-doubt", count: 5, color: "#f87171" },
  ];

  // Bar chart animation
  const barProgress = interpolate(frame, [50, 90], [0, 1], { extrapolateRight: "clamp" });

  // Bottom tagline
  const taglineOp = interpolate(frame, [95, 115], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [95, 115], [30, 0], { extrapolateRight: "clamp" });

  // Ending fade
  const endFade = interpolate(frame, [120, 140], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", opacity: endFade }}>
      {/* Step label */}
      <div
        style={{
          marginTop: 440,
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
        Step 3
      </div>

      {/* Title */}
      <div
        style={{
          marginTop: 24,
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          fontSize: 56,
          fontFamily: fonts.display,
          fontStyle: "italic",
          color: colors.text,
          textAlign: "center",
          lineHeight: 1.2,
          padding: "0 80px",
        }}
      >
        See patterns over time.
      </div>

      {/* Theme cards grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
          width: 860,
          marginTop: 60,
          justifyContent: "center",
        }}
      >
        {themes.map((theme, i) => {
          const cardScale = spring({
            frame: frame - 20 - i * 8,
            fps,
            config: { damping: 15, stiffness: 120 },
          });
          return (
            <div
              key={theme.name}
              style={{
                width: 410,
                borderRadius: 24,
                background: colors.surface,
                padding: "32px 28px",
                transform: `scale(${cardScale})`,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: `${theme.color}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: theme.color,
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontFamily: fonts.body,
                    fontWeight: 600,
                    color: colors.text,
                  }}
                >
                  {theme.name}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontFamily: fonts.body,
                    color: colors.textDim,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {theme.count} mentions
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini bar chart */}
      <div
        style={{
          marginTop: 48,
          width: 860,
          borderRadius: 24,
          background: colors.surface,
          padding: "36px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
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
          }}
        >
          Fact vs Assumption
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, color: colors.text, marginBottom: 8 }}>Facts</div>
            <div style={{ height: 12, borderRadius: 6, background: colors.bgLight, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${64 * barProgress}%`,
                  borderRadius: 6,
                  background: colors.mint,
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.mint }}>
            {Math.round(64 * barProgress)}%
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 56,
          opacity: taglineOp,
          transform: `translateY(${taglineY}px)`,
          fontSize: 38,
          fontFamily: fonts.display,
          fontStyle: "italic",
          color: colors.mint,
          textAlign: "center",
          lineHeight: 1.4,
          padding: "0 100px",
        }}
      >
        Talk it out. See the pattern.
      </div>
    </AbsoluteFill>
  );
};
